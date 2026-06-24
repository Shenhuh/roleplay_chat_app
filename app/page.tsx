'use client'
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation'



export default function Home() {
  
  const router = useRouter()
  const [characters, setCharacters] = useState<{id: string, name: string}[]>([])
  const [portraying, setPortraying] = useState<string>('')
    const [selected, setSelected] = useState<string>('')
  
  useEffect(() => {
      async function loadCharacters() {
          // Step 1: check if library exists for this user + city
          const { data: character } = await supabase
          .from('characters')
          .select()
          

          if(character){
            setCharacters(character)
          }
      }
      loadCharacters()
      }, [])

  const handleSelected = (id: string) => {
    setSelected(id);
  }   
  const handlePortrayed = (id: string) => {
    setPortraying(id);
  }    
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 flex flex-col gap-6 shadow-md">
        <h1 className="text-gray-900 text-2xl font-bold text-center">Start a Conversation</h1>
        
        <div className="flex flex-col gap-2">
          <Label className="text-gray-600">Portray as</Label>
          <Select onValueChange={(value) => handlePortrayed(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a character" />
            </SelectTrigger>
            <SelectContent>
              {characters.filter(c => c.id !== selected).map((character, i) => (
                <SelectItem key={i} value={character.id}>
                  {character.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-gray-600">Talk to</Label>
          <Select onValueChange={(value) => handleSelected(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a character" />
            </SelectTrigger>
            <SelectContent>
              {characters.filter(c => c.id !== portraying).map((character, i) => (
                <SelectItem key={i} value={character.id}>
                  {character.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => router.push(`/chat/${selected}?portraying=${portraying}`)} className="w-full bg-teal-500 hover:bg-teal-400 text-white">Start Chat</Button>
      </div>
    </div>
  )
}
