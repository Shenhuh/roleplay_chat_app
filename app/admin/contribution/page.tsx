'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Copy, Check } from 'lucide-react'

export default function ContributionPage() {
  const [characters, setCharacters] = useState<{id: string, name: string}[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<string>('')
  const [generatedLink, setGeneratedLink] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadCharacters() {
      const { data } = await supabase
        .from('characters')
        .select('id, name')

      if (data) {
        setCharacters(data)
      }
    }

    loadCharacters()
  }, [])

  function handleGenerate() {
    if (!selectedCharacter) return
    const link = `${window.location.origin}/contribute/${selectedCharacter}`
    setGeneratedLink(link)
    setCopied(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create Contribution Link</h1>

        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Select a character to generate a contribution link</Label>
            <Select onValueChange={(value) => setSelectedCharacter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a character" />
              </SelectTrigger>
              <SelectContent>
                {characters.map((character) => (
                  <SelectItem key={character.id} value={character.id}>
                    {character.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Generate Link
          </Button>

          {generatedLink && (
            <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-lg border">
              <Label className="text-gray-500 text-sm">Contribution Link</Label>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}