'use client'
import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <Link href="/admin/characters" className="bg-white p-4 rounded-lg shadow hover:shadow-md text-center font-medium">
          Characters
        </Link>
        <Link href="/admin/factions" className="bg-white p-4 rounded-lg shadow hover:shadow-md text-center font-medium">
          Factions
        </Link>
        <Link href="/admin/regions" className="bg-white p-4 rounded-lg shadow hover:shadow-md text-center font-medium">
          Regions
        </Link>
        <Link href="/admin/monsters" className="bg-white p-4 rounded-lg shadow hover:shadow-md text-center font-medium">
          Monsters
        </Link>
        <Link href="/admin/world-lore" className="bg-white p-4 rounded-lg shadow hover:shadow-md text-center font-medium">
          World Lore
        </Link>
        <Link href="/admin/relationships" className="bg-white p-4 rounded-lg shadow hover:shadow-md text-center font-medium">
          Relationships
        </Link>
      </div>
    </div>
  )
}