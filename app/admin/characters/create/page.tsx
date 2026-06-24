'use client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CreateCharacterPage() {
    const [name, setName] = useState<string>('')
    const [age, setAge] = useState<string>('')
    const [element, setElement] = useState<string>('')
    const [location, setLocation] = useState<string>('')
    const [lore, setLore] = useState<string>('')
    const [faction, setFaction] = useState<string>('')
    const [factionId, setFactionId] = useState<{id: string, name: string}[]>([])
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string>('')
    const router = useRouter()

     useEffect(() => {
        async function setup() {
            const { data: factions} = await supabase
            .from('factions')
            .select('*')
            setFactionId(factions ?? [])            
        }
    
        setup()
    }, [])

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (file) {
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
      }
    }

    async function handleSubmit(){
        let imageUrl = ''

        if (imageFile) {
          const fileName = `${Date.now()}-${imageFile.name}`
          const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('character-images')
            .upload(fileName, imageFile)

          if (uploadData) {
            const { data: publicUrlData } = supabase
              .storage
              .from('character-images')
              .getPublicUrl(fileName)
            imageUrl = publicUrlData.publicUrl
          }
        }

        const { data: character } = await supabase
        .from('characters')
        .insert({ name: name, age: age, element: element, location: location, lore: lore, faction_id: faction, image: imageUrl })
        .select()
        .single()

         router.push(`/admin/characters`)
    }
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Character</h1>
        <Link href="/admin/characters">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-6 max-w-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>Image</Label>
          {imagePreview && (
            <img src={imagePreview} alt="preview" className="w-32 h-32 object-cover rounded-full border" />
          )}
          <Input type="file" accept="image/*" onChange={handleImageChange} />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Element</Label>
          <Input value={element} onChange={(e) => setElement(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Age</Label>
          <Input value={age} onChange={(e) => setAge(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Faction</Label>
          <Select onValueChange={(value) => setFaction(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Pick a faction" />
            </SelectTrigger>
            <SelectContent>
              {factionId.map((faction, i) => (
                <SelectItem key={i} value={faction.id}>
                  {faction.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label>Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Lore</Label>
          <textarea value={lore} onChange={(e) => setLore(e.target.value)} className="border rounded-lg p-2 text-sm min-h-[120px] resize-y" placeholder="Character lore..." />
        </div>

        <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={handleSubmit} >Create Character</Button>
      </div>
    </div>
  )
}