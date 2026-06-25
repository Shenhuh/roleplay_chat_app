'use client'
import { use } from 'react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { getUserId } from '@/lib/user'
import ReactMarkdown from 'react-markdown'

export default function ChatPage({ params, searchParams }: { 
  params: Promise<{ characterId: string }>,
  searchParams: Promise<{ portraying: string }>
}) {
  const { characterId } = use(params)
  const { portraying } = use(searchParams)
  const [conversationId, setConversationId] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [moodScore, setMoodScore] = useState(50);
  const [characterName, setCharacterName] = useState(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoadingResponse, setLoadingResponse] = useState(false)

  useEffect(() => {
    async function setup() {
        const { data: character } = await supabase
        .from('characters')
        .select()
        .eq('id', characterId)
        .single()
        setCharacterName(character.name)

        const { data: existing } = await supabase
        .from('conversations')
        .select()
        .eq('user_id', getUserId())
        .eq('character_id', characterId)
        .limit(1)
        .maybeSingle()
        setMoodScore(existing?.mood_score ?? 50)

        let convId = existing?.id

        if (!existing) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ user_id: getUserId(), character_id: characterId })
            .select()
            .single()
          convId = newConv?.id
        }
        setConversationId(convId)
        
        const { data: messages } = await supabase
        .from('messages')
        .select()
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        setMessages(messages ?? [])
    }

    setup()
  }, [])

  async function sendMessage() {
    setLoadingResponse(true)
    
    if (!input || !conversationId) return

    const updatedMessages = [...messages, { role: 'user', content: input }]

    await supabase
      .from('messages')
      .insert({ role: 'user', conversation_id: conversationId, content: input })
      .select()
      .single()

    setMessages(updatedMessages)
    setInput('')

    const response = await fetch("/api/chat", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, conversation_id: conversationId, character_id: characterId, portraying: portraying })
    })
    const data = await response.json()
    setBlocked(data.blocked)
    setMoodScore(data.mood_score)
    setLoadingResponse(false)

    await supabase
      .from('messages')
      .insert({ role: 'assistant', conversation_id: conversationId, content: data.result })
      .select()
      .single()

    setMessages(prev => [...prev, { role: 'assistant', content: data.result }])
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b font-bold capitalize">{characterName}</div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, i) => (
         <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
          <div className={msg.role === 'user' ? 'bg-teal-300 rounded-lg p-3 max-w-[70%]' : 'bg-gray-300 rounded-lg p-3 max-w-[70%]'}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        </div>
        ))}
        {isLoadingResponse && <p className='capitalize'>{characterName} is typing...</p>}
        {blocked && <p className='text-center capitalize'>{characterName} has blocked you.</p>}
      </div>

      <div className="p-4 border-t flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." disabled={blocked} />
        <Button onClick={sendMessage}>{blocked ? "Request Unblock" : "Send"}</Button>  
      </div>
    </div>
  )
}