'use client'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pencil, Trash2 } from 'lucide-react'

export default function AdminPage() {
    const [characters, setCharacters] = useState<any[]>([])
    useEffect(() => {
        async function loadCharacters() {
            const { data: character } = await supabase
            .from('characters')
            .select('*')
            setCharacters(character ?? [])            
        }
    
        loadCharacters()
    }, [])

    async function handleDelete(id: string) {
        const { data: character } = await supabase
        .from('characters')
        .delete()
        .eq('id', id)       

        setCharacters(prev => prev.filter(c => c.id !== id))
    }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Characters</h1>
            <Link href="/admin/characters/create" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Create a new character
            </Link>
        </div>
        <Table>
            <TableCaption>A list of your characters.</TableCaption>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Lore</TableHead>
                <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {characters.map((character) => (
                <TableRow key={character.id}>
                    <TableCell>
                      {character.image ? (
                        <img src={character.image} alt={character.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{character.id}</TableCell>
                    <TableCell>{character.name}</TableCell>
                    <TableCell>{character.lore}</TableCell>  
                    <TableCell className="flex gap-2">
                    <button className='bg-blue-100 p-1 rounded'>
                        <Pencil size={16} />
                    </button>
                    <button className='bg-red-100 p-1 rounded' onClick={() => handleDelete(character.id)}>
                        <Trash2 size={16} />
                    </button>
                    </TableCell>                  
                </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  )
}