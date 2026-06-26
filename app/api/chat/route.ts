import { getAIResponse } from "@/lib/ai";
import { supabase } from '@/lib/supabase'

// Define types for better type safety
interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface Character {
    id: string;
    name: string;
    age?: string;
    element?: string;
    location?: string;
    lore?: string;
}

interface Conversation {
    mood_score: number;
    summary: string | null;
}

interface Relationship {
    relationship_type: string;
    description: string;
}

interface AIResponse {
    reply: string;
    mood_delta: number;
}

export async function POST(request: Request) {
    try {
        const { messages, character_id, portraying, conversation_id } = await request.json();

        let blocked = false;

        // Fetch relationship data
        const { data: relationship, error: relationshipError } = await supabase
            .from('character_relationships')
            .select('relationship_type, description')
            .or(`and(character_id.eq.${character_id},related_character_id.eq.${portraying}),and(character_id.eq.${portraying},related_character_id.eq.${character_id})`)
            .limit(1)
            .maybeSingle();

        if (relationshipError) {
            console.error('Error fetching relationship:', relationshipError);
        }

        const relationship_type = relationship?.relationship_type;
        const relationship_description = relationship?.description;

        // Fetch conversation data
        const { data: conversation, error: conversationError } = await supabase
            .from('conversations')
            .select('mood_score, summary')
            .eq('id', conversation_id)
            .single();

        if (conversationError) {
            console.error('Error fetching conversation:', conversationError);
            return Response.json({ error: 'Failed to fetch conversation' }, { status: 500 });
        }

        const currentMood = conversation?.mood_score ?? 50;
        const currentSummary = conversation?.summary ?? null;

        // Fetch character data
        const { data: character, error: characterError } = await supabase
            .from('characters')
            .select('name, age, element, location, lore')
            .eq('id', character_id)
            .single();

        if (characterError) {
            console.error('Error fetching character:', characterError);
            return Response.json({ error: 'Failed to fetch character' }, { status: 500 });
        }

        // Fetch portraying character data
        const { data: portrayingCharacter, error: portrayingError } = await supabase
            .from('characters')
            .select('name, age, element, location, lore')
            .eq('id', portraying)
            .single();

        if (portrayingError) {
            console.error('Error fetching portraying character:', portrayingError);
            return Response.json({ error: 'Failed to fetch portraying character' }, { status: 500 });
        }

        // Summarization
        const recentMessages = messages.slice(-10);
        const conversationText = recentMessages.map((message: Message) =>
            `${message.role}: ${message.content}`
        ).join("\n");

        let summaryPrompt = "";

        if (currentSummary) {
            summaryPrompt = `
        You are maintaining long-term memory for a roleplaying conversation.

        Current Summary:
        ${currentSummary}

        Recent Conversation:
        ${conversationText}

        Update the current summary.

        Keep all important existing information unless it is contradicted.
        Add any new facts, relationship changes, promises, goals, emotional developments, or ongoing conflicts from the recent conversation.
        Do not include greetings, filler, or repeated information.

        Return ONLY the updated summary.
        `;
        } else {
            summaryPrompt = `
        You are creating long-term memory for a roleplaying conversation.

        Recent Conversation:
        ${conversationText}

        Create an initial summary.

        Include:
        - Important facts learned about either character.
        - Relationship changes.
        - Promises made.
        - Goals or plans.
        - Important emotional events.
        - Ongoing conflicts.
        - Important decisions.

        Do NOT include greetings, small talk, repeated information, or filler conversation.

        Return ONLY the summary.
        `;
        }

        // Get updated summary
        const updatedSummary = await getAIResponse([
            {
                role: "system",
                content: "You maintain long-term memory for roleplaying conversations."
            },
            {
                role: "user",
                content: summaryPrompt
            }
        ]);

        // Replying
        let systemPrompt = 'You are a helpful assistant.';

        if (character && portrayingCharacter) {
            systemPrompt = `Always respond in valid JSON format with exactly two fields: "reply" (your in-character response as a string) and "mood_delta" (an integer between -20 and 20 based on how this interaction made you feel as this character. Positive if the interaction was pleasant, negative if rude or uncomfortable, 0 if neutral). Do not include any text outside the JSON. 
        Conversation Memory:
        ${updatedSummary}. 
        You are ${character.name}.`;

            if (character.age) systemPrompt += ` Age: ${character.age}.`;
            if (character.lore) systemPrompt += ` ${character.lore}`;
            systemPrompt += ` You are talking to ${portrayingCharacter?.name}.`;
        }

        // Mood System
        if (currentMood <= 10) {
            systemPrompt += ` You are highly irritated or probably insulted on how this person talks. And your moods is heavily negative towards this person.`;
            const blockingRand = Math.floor(Math.random() * 101);
            if (blockingRand > 85) {
                blocked = true;
                systemPrompt += ` You have blocked ${portrayingCharacter?.name}. There's a chance ${portrayingCharacter?.name} will ask for unblock.`;
            }
        } else if (currentMood <= 30) {
            systemPrompt += ` You are starting to doubt or disliking this person.`;
        } else if (currentMood <= 50) {
            systemPrompt += ` Your mood toward this person is neutral.`;
        } else if (currentMood <= 75) {
            systemPrompt += ` Your mood toward this person is good.`;
        } else {
            systemPrompt += ` You're having fun chatting with this person.`;
        }

        if (relationship_type) {
            systemPrompt += ` Your relationship with this person is ${relationship_type}.`;
        }

        if (relationship_description) {
            systemPrompt += ` You both are ${relationship_description}.`;
        }

        // Get AI response
        const aiMessages: Message[] = [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-5) // Include last 5 messages for context
        ];

        let aiResponse;
        try {
            aiResponse = await getAIResponse(aiMessages);
        } catch (error) {
            console.error('Error getting AI response:', error);
            return Response.json({ error: 'Failed to generate response' }, { status: 500 });
        }

        // Parse and handle AI response
        try {
            const parsed: AIResponse = JSON.parse(aiResponse);
            const moodDelta = Math.min(20, Math.max(-20, parsed.mood_delta || 0));
            const newScore = Math.min(100, Math.max(0, currentMood + moodDelta));

            // Update conversation
            const { error: updateError } = await supabase
                .from('conversations')
                .update({ 
                    mood_score: newScore, 
                    summary: updatedSummary 
                })
                .eq('id', conversation_id);

            if (updateError) {
                console.error('Error updating conversation:', updateError);
                // Continue anyway - the response was generated successfully
            }

            return Response.json({ 
                result: parsed.reply, 
                mood_score: newScore, 
                blocked: blocked 
            });

        } catch (parseError) {
            // If JSON parsing fails, return the raw response
            console.error('Error parsing AI response:', parseError);
            return Response.json({ 
                result: aiResponse, 
                mood_score: currentMood, 
                blocked: blocked 
            });
        }

    } catch (error) {
        console.error('Unexpected error:', error);
        return Response.json({ 
            error: 'An unexpected error occurred' 
        }, { status: 500 });
    }
}