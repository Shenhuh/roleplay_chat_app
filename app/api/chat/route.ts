import { getAIResponse } from "@/lib/ai";
import { supabase } from '@/lib/supabase'

export async function POST(request: Request){

    const { messages, character_id, portraying, conversation_id } = await request.json()

    let blocked = false;

    const { data: relationship } = await supabase
        .from('character_relationships')
        .select('relationship_type, description')
        .or(`and(character_id.eq.${character_id},related_character_id.eq.${portraying}),and(character_id.eq.${portraying},related_character_id.eq.${character_id})`)
        .limit(1)
        .maybeSingle()

    const relationship_type = relationship?.relationship_type
    const relationship_description = relationship?.description
       

    const { data: conversation } = await supabase
        .from('conversations')
        .select('mood_score, summary, last_summary_message_count')
        .eq('id', conversation_id)
        .single()

    const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversation_id);

    const totalMessages = count ?? 0;
    const lastSummaryMessageCount = conversation?.last_summary_message_count ?? 0;


    const currentMood = conversation?.mood_score ?? 50
    const currentSummary = conversation?.summary ?? null

    const { data: character } = await supabase
        .from('characters')
        .select('name, age, element, location, lore')
        .eq('id', character_id)
        .single()

    const { data: portrayingCharacter } = await supabase
        .from('characters')
        .select('name, age, element, location, lore')
        .eq('id', portraying)
        .single()

    //Summarization
    let newSummary = messages.slice(-10);        
    const conversationText = newSummary.map((message: { role: string; content: string }) =>
    `${message.role}: ${message.content}`
    ).join("\n");
    
    let summaryPrompt = "";

    if (currentSummary) {
        summaryPrompt = `
    You are maintaining long-term memory for a roleplaying conversation.

    Current Summary:
    ${currentSummary ?? ""}

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

    let updatedSummary;
    async function updateSummary(){
        updatedSummary = await getAIResponse([
            { role: "system", content: summaryPrompt }
        ]);
    }


    


    //Replying
    let systemPrompt = 'You are a helpful assistant.'

  
    
    if(character && portraying){
        systemPrompt =`Always respond in valid JSON format with exactly two fields: "reply" (your in-character response as a string) and "mood_delta" (an integer between -20 and 20 based on how this interaction made you feel as this character. Positive if the interaction was pleasant, negative if rude or uncomfortable, 0 if neutral). Do not include any text outside the JSON. 
        Conversation Memory:
        ${currentSummary}. 
        You are ${character.name}.`
        
        
        if (character.age) systemPrompt += ` Age: ${character.age}.`
        if (character.lore) systemPrompt += ` ${character.lore}`
        systemPrompt += ` You are talking to ${portrayingCharacter?.name}.`
        
    }

    //Mood System

    if (currentMood <= 10) {
        systemPrompt += ` You are highly irritated or probably insulted on how this person talks. And your moods is heavily negative towards this person`
        let blockingRand = Math.floor(Math.random() * 101);
        if(blockingRand > 85){
            blocked = true
            systemPrompt += ` You have blocked ${portrayingCharacter?.name}. There's a chance ${portrayingCharacter?.name} will ask for unblock.`
        }
    } else if (currentMood >= 11 && currentMood <= 40) {
        systemPrompt += ` You are starting to doubt or disliking this person.`
    } else if (currentMood >= 41 && currentMood <= 60) {
        systemPrompt += ` Your mood toward this person is neutral.`
    } else if (currentMood >= 61 && currentMood <= 85) {
        systemPrompt += ` Your mood toward this person is is good.`
    } else if (currentMood >= 86 && currentMood <= 100) {
        systemPrompt += ` Youre having fun chatting toward this person.`
    } else {
        systemPrompt += ` You're now highly comfortable chatting with this person.`
    }

    if(relationship_type){
        systemPrompt += 'Your relationship with this person is'+relationship_type
    }

    if(relationship_description){
        systemPrompt += 'You both are'+relationship_description
    }

    const appendedMessage = [{ role: 'system', content: systemPrompt}, ...messages]
    const message = await getAIResponse(appendedMessage)

    try {
        const parsed = JSON.parse(message)
        const newScore = Math.min(100, Math.max(0, currentMood + parsed.mood_delta))
        
        await supabase
            .from('conversations')
            .update({ mood_score: newScore })
            .eq('id', conversation_id)

            if (
                totalMessages % 10 === 0 &&
                totalMessages > lastSummaryMessageCount
            ) {
                await updateSummary();

                await supabase
                    .from("conversations")
                    .update({
                        summary: updatedSummary,
                        last_summary_message_count: totalMessages
                    })
                    .eq("id", conversation_id);
            }

        return Response.json({ result: parsed.reply, mood_score: newScore, blocked: blocked })
    } catch(e) {
        return Response.json({ result: message, mood_score: currentMood, blocked: blocked  })
    }
}