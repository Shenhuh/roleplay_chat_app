'use client'
import { ReactFlow, Node, Edge, Background, Controls, addEdge, useNodesState, useEdgesState, NodeProps, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// Predefined relationship types
const RELATIONSHIP_TYPES = [
  { value: 'friend', label: 'Friend' },
  { value: 'best_friend', label: 'Best Friend' },
  { value: 'rival', label: 'Rival' },
  { value: 'enemy', label: 'Enemy' },
  { value: 'family', label: 'Family' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'partner', label: 'Partner' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'student', label: 'Student' },
  { value: 'ally', label: 'Ally' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'acquaintance', label: 'Acquaintance' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' }
]

function CircleNode({ data }: NodeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap' }}>
        {data.label as string}
      </span>
      <div style={{
        width: (data.isCenter as boolean) ? 100 : 80,
        height: (data.isCenter as boolean) ? 100 : 80,
        borderRadius: '50%',
        background: '#e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: (data.isCenter as boolean) ? '4px solid #f6ad55' : '3px solid #4fd1c5',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <Handle type="target" position={Position.Top} style={{ width: 10, height: 10, background: '#4fd1c5' }} />
        {data.image ? (
          <img src={data.image as string} alt={data.label as string} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 11, color: '#999' }}>No Image</span>
        )}
        <Handle type="source" position={Position.Bottom} style={{ width: 10, height: 10, background: '#4fd1c5' }} />
      </div>
    </div>
  )
}

const nodeTypes = { circle: CircleNode }

export default function RelationshipsPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [characters, setCharacters] = useState<{id: string, name: string}[]>([])
  const [centerNode, setCenterNode] = useState<Node | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [pendingConnection, setPendingConnection] = useState<{source: string, target: string} | null>(null)
  const [relationshipType, setRelationshipType] = useState('')
  const [description, setDescription] = useState('')
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null)
  const [customRelationshipType, setCustomRelationshipType] = useState('')
  const [isCustomType, setIsCustomType] = useState(false)

  useEffect(() => {
    async function loadCharacters() {
      const { data } = await supabase
        .from('characters')
        .select('id, name, image')

      if (data) {
        setCharacters(data)
        const newNodes: Node[] = data.map((char, i) => ({
          id: char.id,
          type: 'circle',
          position: {
            x: 300 + 200 * Math.cos((2 * Math.PI * i) / data.length),
            y: 300 + 200 * Math.sin((2 * Math.PI * i) / data.length)
          },
          data: { label: char.name, image: char.image, isCenter: false }
        }))
        setNodes(newNodes as any)
      }
    }

    loadCharacters()
  }, [])

  useEffect(() => {
    if (!centerNode) {
      setEdges([])
      return
    }

    async function loadRelationships() {
      const { data: relationships } = await supabase
        .from('character_relationships')
        .select('*')
        .or(`character_id.eq.${centerNode!.id},related_character_id.eq.${centerNode!.id}`)

      if (relationships) {
        const newEdges: Edge[] = relationships.map(rel => ({
          id: rel.id,
          source: rel.character_id,
          target: rel.related_character_id,
          label: rel.relationship_type,
          data: { relationshipType: rel.relationship_type }
        }))
        setEdges(newEdges as any)
      }
    }

    loadRelationships()
  }, [centerNode])

  function handleSelectCharacter(value: string) {
    const selectedNode = nodes.find(n => n.id === value)
    if (selectedNode) {
      setCenterNode(selectedNode)
      setNodes(nds => nds.map(n => ({
        ...n,
        data: { ...n.data, isCenter: n.id === value }
      })) as any)
    }
  }

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (!centerNode) return
    if (centerNode.id !== node.id) {
      setPendingConnection({ source: centerNode.id, target: node.id })
      setEditingRelationshipId(null)
      setRelationshipType('')
      setDescription('')
      setCustomRelationshipType('')
      setIsCustomType(false)
      setShowModal(true)
    }
  }, [centerNode])

  const onEdgeClick = useCallback(async (event: React.MouseEvent, edge: Edge) => {
    const { data } = await supabase
      .from('character_relationships')
      .select('*')
      .eq('id', edge.id)
      .single()

    if (data) {
      const type = data.relationship_type ?? ''
      const isCustom = !RELATIONSHIP_TYPES.some(t => t.value === type)
      
      setEditingRelationshipId(data.id)
      setRelationshipType(type)
      setDescription(data.description ?? '')
      setCustomRelationshipType(isCustom ? type : '')
      setIsCustomType(isCustom)
      setPendingConnection({ source: data.character_id, target: data.related_character_id })
      setShowModal(true)
    }
  }, [])

  async function handleSaveRelationship() {
    if (!pendingConnection) return

    const finalType = isCustomType ? customRelationshipType : relationshipType
    
    if (!finalType) {
      alert('Please select or enter a relationship type')
      return
    }

    if (editingRelationshipId) {
      await supabase
        .from('character_relationships')
        .update({
          relationship_type: finalType,
          description: description
        })
        .eq('id', editingRelationshipId)

      setEdges(eds => eds.map(e => e.id === editingRelationshipId
        ? { ...e, label: finalType, data: { relationshipType: finalType } }
        : e
      ) as any)
    } else {
      const { data } = await supabase
        .from('character_relationships')
        .insert({
          character_id: pendingConnection.source,
          related_character_id: pendingConnection.target,
          relationship_type: finalType,
          description: description
        })
        .select()
        .single()

      if (data) {
        setEdges(eds => addEdge({
          id: data.id,
          source: pendingConnection.source,
          target: pendingConnection.target,
          label: finalType,
          data: { relationshipType: finalType }
        }, eds) as any)
      }
    }

    setShowModal(false)
    setRelationshipType('')
    setDescription('')
    setCustomRelationshipType('')
    setIsCustomType(false)
    setPendingConnection(null)
    setEditingRelationshipId(null)
  }

  async function handleDeleteRelationship() {
    if (!editingRelationshipId) return

    await supabase
      .from('character_relationships')
      .delete()
      .eq('id', editingRelationshipId)

    setEdges(eds => eds.filter(e => e.id !== editingRelationshipId) as any)
    setShowModal(false)
    setRelationshipType('')
    setDescription('')
    setCustomRelationshipType('')
    setIsCustomType(false)
    setPendingConnection(null)
    setEditingRelationshipId(null)
  }

  function handleCancel() {
    setShowModal(false)
    setRelationshipType('')
    setDescription('')
    setCustomRelationshipType('')
    setIsCustomType(false)
    setPendingConnection(null)
    setEditingRelationshipId(null)
  }

  function handleClear() {
    setCenterNode(null)
    setEdges([])
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isCenter: false } })) as any)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Relationships</h1>
        <div className="flex items-center gap-2">
          <Select onValueChange={handleSelectCharacter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select character" />
            </SelectTrigger>
            <SelectContent>
              {characters.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {centerNode && (
            <Button variant="outline" size="sm" onClick={handleClear}>Clear</Button>
          )}
        </div>
      </div>

      <div style={{ width: '100%', height: '700px' }} className="rounded-xl overflow-hidden border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          nodesConnectable={false}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 w-96 max-w-[90vw]">
            <h2 className="font-bold text-lg">
              {editingRelationshipId ? 'Edit Relationship' : 'Define Relationship'}
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="relationship-type">Relationship Type</Label>
              <Select 
                value={isCustomType ? 'custom' : relationshipType} 
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setIsCustomType(true)
                    setRelationshipType('')
                  } else {
                    setIsCustomType(false)
                    setRelationshipType(value)
                    setCustomRelationshipType('')
                  }
                }}
              >
                <SelectTrigger id="relationship-type">
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isCustomType && (
              <div className="space-y-2">
                <Label htmlFor="custom-type">Custom Relationship Type</Label>
                <Input
                  id="custom-type"
                  placeholder="Enter custom relationship type"
                  value={customRelationshipType}
                  onChange={(e) => setCustomRelationshipType(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Lore</Label>
              <textarea
                id="description"
                placeholder="Describe the relationship..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              />
            </div>

            <div className="flex gap-2 mt-2">
              <Button onClick={handleCancel} variant="outline" className="flex-1">Cancel</Button>
              {editingRelationshipId && (
                <Button onClick={handleDeleteRelationship} variant="destructive" className="flex-1">Delete</Button>
              )}
              <Button 
                onClick={handleSaveRelationship} 
                className="flex-1 bg-teal-500 text-white hover:bg-teal-600"
                disabled={isCustomType ? !customRelationshipType : !relationshipType}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}