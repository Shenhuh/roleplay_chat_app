'use client'
import Link from 'next/link'

const navItems = [
  { label: 'Characters', href: '/admin/characters' },
  { label: 'Factions', href: '/admin/factions' },
  { label: 'Regions', href: '/admin/regions' },
  { label: 'Monsters', href: '/admin/monsters' },
  { label: 'World Lore', href: '/admin/world-lore' },
  { label: 'Relationships', href: '/admin/relationships' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col p-6 gap-2">
        <h1 className="text-xl font-bold mb-6">Admin Panel</h1>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="p-3 rounded-lg hover:bg-gray-100 font-medium text-gray-700">
            {item.label}
          </Link>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}