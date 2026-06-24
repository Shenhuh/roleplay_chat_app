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
    const [regions, setRegions] = useState<{id: string, name: string, lore: string}[]>([])
    useEffect(() => {
        async function setup() {
            const { data: region } = await supabase
            .from('regions')
            .select('*')
            setRegions(region ?? [])            
        }
    
        setup()
      }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">Regions</h1>
        <Table>
            <TableCaption>A list of your regions.</TableCaption>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Lore</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {regions.map((region) => (
                <TableRow key={region.id}>
                    <TableCell className="font-medium">{region.id}</TableCell>
                    <TableCell>{region.name}</TableCell>
                    <TableCell>{region.lore}</TableCell>                    
                </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  )
}