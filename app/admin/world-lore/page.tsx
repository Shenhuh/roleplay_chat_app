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
    const [worldLores, setWorldLores] = useState<{id: string, name: string, lore: string}[]>([])
    useEffect(() => {
        async function setup() {
            const { data: worldLore } = await supabase
            .from('worldLores')
            .select('*')
            setWorldLores(worldLore ?? [])            
        }
    
        setup()
      }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">World Lores</h1>
        <Table>
            <TableCaption>A list of your world lores.</TableCaption>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Lore</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {worldLores.map((worldLore) => (
                <TableRow key={worldLore.id}>
                    <TableCell className="font-medium">{worldLore.id}</TableCell>
                    <TableCell>{worldLore.name}</TableCell>
                    <TableCell>{worldLore.lore}</TableCell>                    
                </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  )
}