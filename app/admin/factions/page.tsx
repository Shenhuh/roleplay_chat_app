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
    const [factions, setFactions] = useState<{id: string, name: string, lore: string}[]>([])
    useEffect(() => {
        async function setup() {
            const { data: faction } = await supabase
            .from('factions')
            .select('*')
            setFactions(faction ?? [])            
        }
    
        setup()
      }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">Factions</h1>
        <Table>
            <TableCaption>A list of your factions.</TableCaption>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Lore</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {factions.map((faction) => (
                <TableRow key={faction.id}>
                    <TableCell className="font-medium">{faction.id}</TableCell>
                    <TableCell>{faction.name}</TableCell>
                    <TableCell>{faction.lore}</TableCell>                    
                </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  )
}