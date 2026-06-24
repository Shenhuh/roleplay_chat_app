'use client'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


export default function AdminPage() {
    const [monsters, setMonsters] = useState<{id: string, name: string, lore: string}[]>([])
    useEffect(() => {
        async function setup() {
            const { data: monster } = await supabase
            .from('monsters')
            .select('*')
            setMonsters(monster ?? [])            
        }
    
        setup()
      }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">Monsters</h1>
        <Table>
            <TableCaption>A list of your monsters.</TableCaption>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Lore</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {monsters.map((monster) => (
                <TableRow key={monster.id}>
                    <TableCell className="font-medium">{monster.id}</TableCell>
                    <TableCell>{monster.name}</TableCell>
                    <TableCell>{monster.lore}</TableCell>                    
                </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  )
}