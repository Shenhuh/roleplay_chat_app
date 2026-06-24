import { getAIResponse } from "@/lib/ai";
import { supabase } from '@/lib/supabase'

export async function POST(request: Request){

    const { messages, character_id, portraying, conversation_id } = await request.json()

    const { data: conversation } = await supabase
        .from('conversations')
        .select('mood_score')
        .eq('id', conversation_id)
        .single()

    const currentMood = conversation?.mood_score ?? 50

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

    let systemPrompt = 'You are a helpful assistant.'
    
    if(character && portraying){
        systemPrompt = `Always respond in valid JSON format with exactly two fields: "reply" (your in-character response as a string) and "mood_delta" (an integer between -20 and 20 based on how this interaction made you feel as this character. Positive if the interaction was pleasant, negative if rude or uncomfortable, 0 if neutral). Do not include any text outside the JSON. You are ${character.name}.`
        if (character.age) systemPrompt += ` Age: ${character.age}.`
        if (character.lore) systemPrompt += ` ${character.lore}`
        systemPrompt += ` You are talking to ${portrayingCharacter?.name}.`
        if (currentMood <= 10) {
            systemPrompt += ` Your mood toward this person is extremely negative (${currentMood}/100). You are hostile, dismissive, and want nothing to do with them.`
        } else if (currentMood <= 40) {
            systemPrompt += ` Your mood toward this person is cold (${currentMood}/100). You are distant, short, and visibly uncomfortable.`
        } else if (currentMood <= 70) {
            systemPrompt += ` Your mood toward this person is neutral (${currentMood}/100). You are polite but not warm.`
        } else {
            systemPrompt += ` Your mood toward this person is very positive (${currentMood}/100). You are warm, open, and enjoy their company.`
        }
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

        return Response.json({ result: parsed.reply, mood_score: newScore })
    } catch(e) {
        return Response.json({ result: message, mood_score: currentMood })
    }
}