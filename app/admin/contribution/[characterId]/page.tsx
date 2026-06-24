'use client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { X } from 'lucide-react'
import { getUserId } from '@/lib/user'
import { ReactFlow, Node, Edge, Background, Controls, NodeProps, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

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

interface Character {
  id: string
  name: string
  nickname?: string | null
  age?: string | null
  element?: string | null
  location?: string | null
  lore?: string | null
  image?: string | null
}

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

export default function ContributePage() {
  const params = useParams()
  const characterId = params.characterId as string

  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoreExpanded, setIsLoreExpanded] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [usedFields, setUsedFields] = useState<Record<string, string>>({})
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)

  // Relationship graph state
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [relationshipSubmissions, setRelationshipSubmissions] = useState<any[]>([])
  const [showRelModal, setShowRelModal] = useState(false)
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)
  const [relationshipType, setRelationshipType] = useState('')
  const [customRelationshipType, setCustomRelationshipType] = useState('')
  const [isCustomType, setIsCustomType] = useState(false)
  const [relDescription, setRelDescription] = useState('')

  function handleChange(fieldName: string, value: string) {
    setUsedFields(prev => ({ ...prev, [fieldName]: value }))
  }

  async function loadSubmissions() {
    const { data } = await supabase
      .from('character_field_submissions')
      .select(`
        *,
        characters(name, id),
        character_submission_votes(vote_type, voter_key)
      `)
      .eq('character_id', characterId)

    const formatted =
      data?.map(submission => {
        const votes = submission.character_submission_votes ?? []
        return {
          ...submission,
          upvotes: votes.filter((v: any) => v.vote_type === 'upvote').length,
          downvotes: votes.filter((v: any) => v.vote_type === 'downvote').length,
          myVote: votes.find((v: any) => v.voter_key === getUserId())?.vote_type ?? null
        }
      }) ?? []

    setSubmissions(formatted)
  }

  async function loadRelationshipGraph() {
    const { data: allCharacters } = await supabase
      .from('characters')
      .select('id, name, image')

    if (!allCharacters) return

    const centerChar = allCharacters.find(c => c.id === characterId)
    const otherChars = allCharacters.filter(c => c.id !== characterId)

    const newNodes: Node[] = []

    if (centerChar) {
      newNodes.push({
        id: centerChar.id,
        type: 'circle',
        position: { x: 350, y: 350 },
        data: { label: centerChar.name, image: centerChar.image, isCenter: true },
        draggable: false
      })
    }

    otherChars.forEach((char, i) => {
      newNodes.push({
        id: char.id,
        type: 'circle',
        position: {
          x: 350 + 250 * Math.cos((2 * Math.PI * i) / otherChars.length),
          y: 350 + 250 * Math.sin((2 * Math.PI * i) / otherChars.length)
        },
        data: { label: char.name, image: char.image, isCenter: false },
        draggable: false
      })
    })

    setNodes(newNodes)

    const { data: existingRelationships } = await supabase
      .from('character_relationships')
      .select('*')
      .or(`character_id.eq.${characterId},related_character_id.eq.${characterId}`)

    const { data: pendingSubs } = await supabase
      .from('character_relationship_submissions')
      .select(`
        *,
        character_relationship_submission_votes(vote_type, voter_key)
      `)
      .eq('character_id', characterId)
      .eq('status', 'pending')

    const formattedSubs = pendingSubs?.map(sub => {
      const votes = sub.character_relationship_submission_votes ?? []
      return {
        ...sub,
        upvotes: votes.filter((v: any) => v.vote_type === 'upvote').length,
        downvotes: votes.filter((v: any) => v.vote_type === 'downvote').length,
        myVote: votes.find((v: any) => v.voter_key === getUserId())?.vote_type ?? null
      }
    }) ?? []

    setRelationshipSubmissions(formattedSubs)

    const existingEdges: Edge[] = (existingRelationships ?? []).map(rel => ({
      id: rel.id,
      source: rel.character_id,
      target: rel.related_character_id,
      label: rel.relationship_type,
      style: { stroke: '#4fd1c5' }
    }))

    const pendingEdges: Edge[] = formattedSubs.map(sub => ({
      id: sub.id,
      source: sub.character_id,
      target: sub.related_character_id,
      label: `${sub.relationship_type} (proposed)`,
      style: { stroke: '#f6ad55', strokeDasharray: '5,5' }
    }))

    setEdges([...existingEdges, ...pendingEdges])
  }

  useEffect(() => {
    if (!characterId) return

    async function loadCharacter() {
      setLoading(true)
      const { data } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single()
      setCharacter(data ?? null)
      setLoading(false)
    }

    loadCharacter()
    loadSubmissions()
    loadRelationshipGraph()
  }, [characterId])

  async function handleSubmit() {
    const rowsToInsert = Object.entries(usedFields)
      .filter(([field, value]) => value.trim() !== '')
      .map(([field, value]) => ({
        character_id: characterId,
        field_name: field,
        proposed_value: value
      }))

    if (rowsToInsert.length > 0) {
      await supabase.from('character_field_submissions').insert(rowsToInsert)
      setUsedFields({})
      loadSubmissions()
    }
  }

  async function handleVote(submissionId: string, voteType: 'upvote' | 'downvote') {
    const voterKey = getUserId()

    const { data: existing } = await supabase
      .from('character_submission_votes')
      .select('id, vote_type')
      .eq('submission_id', submissionId)
      .eq('voter_key', voterKey)
      .maybeSingle()

    if (existing?.vote_type === voteType) {
      await supabase.from('character_submission_votes').delete().eq('id', existing.id)
    } else if (existing) {
      await supabase.from('character_submission_votes').update({ vote_type: voteType }).eq('id', existing.id)
    } else {
      await supabase.from('character_submission_votes').insert({ submission_id: submissionId, vote_type: voteType, voter_key: voterKey })
    }

    loadSubmissions()
  }

  async function handleRelationshipVote(submissionId: string, voteType: 'upvote' | 'downvote') {
    const voterKey = getUserId()

    const { data: existing } = await supabase
      .from('character_relationship_submission_votes')
      .select('id, vote_type')
      .eq('submission_id', submissionId)
      .eq('voter_key', voterKey)
      .maybeSingle()

    if (existing?.vote_type === voteType) {
      await supabase.from('character_relationship_submission_votes').delete().eq('id', existing.id)
    } else if (existing) {
      await supabase.from('character_relationship_submission_votes').update({ vote_type: voteType }).eq('id', existing.id)
    } else {
      await supabase.from('character_relationship_submission_votes').insert({ submission_id: submissionId, vote_type: voteType, voter_key: voterKey })
    }

    loadRelationshipGraph()
  }

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.id === characterId) return
    setPendingTarget(node.id)
    setRelationshipType('')
    setCustomRelationshipType('')
    setIsCustomType(false)
    setRelDescription('')
    setShowRelModal(true)
  }, [characterId])

  async function handleSubmitRelationship() {
    if (!pendingTarget) return

    const finalType = isCustomType ? customRelationshipType : relationshipType
    if (!finalType) {
      alert('Please select or enter a relationship type')
      return
    }

    await supabase.from('character_relationship_submissions').insert({
      character_id: characterId,
      related_character_id: pendingTarget,
      relationship_type: finalType,
      description: relDescription
    })

    setShowRelModal(false)
    setPendingTarget(null)
    setRelationshipType('')
    setCustomRelationshipType('')
    setIsCustomType(false)
    setRelDescription('')
    loadRelationshipGraph()
  }

  function handleCancelRelationship() {
    setShowRelModal(false)
    setPendingTarget(null)
    setRelationshipType('')
    setCustomRelationshipType('')
    setIsCustomType(false)
    setRelDescription('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <p>Loading character data...</p>
      </div>
    )
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <p>Character not found</p>
      </div>
    )
  }

  const lorePreview = character.lore
    ? character.lore.length > 100
      ? character.lore.substring(0, 100) + '...'
      : character.lore
    : '—'

  const targetName = nodes.find(n => n.id === pendingTarget)?.data.label as string | undefined

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-4 mb-6">
          <img
            src={character.image || "/aemeath.png"}
            alt={character.name}
            className="w-16 h-16 rounded-full object-cover border"
          />
          <div>
            <h1 className="text-2xl font-bold">Contribute to {character.name}</h1>
            <p className="text-gray-500 text-sm">Help keep this character accurate to the source material</p>
          </div>
        </div>

        {/* FIELD SUBMISSION FORM */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-5">

          <div className="flex flex-col gap-1">
            <Label>Your Name (optional)</Label>
            <Input placeholder="Anonymous" />
          </div>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-1">
            <Label>Name</Label>
            <p className="text-xs text-gray-400 mb-1">Current: {character.name || '—'}</p>
            <Input value={usedFields.name ?? ''} onChange={(e) => handleChange('name', e.target.value)} placeholder="Suggest a correction..." />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Nickname</Label>
            <p className="text-xs text-gray-400 mb-1">Current: {character.nickname || '—'}</p>
            <Input value={usedFields.nickname ?? ''} onChange={(e) => handleChange('nickname', e.target.value)} placeholder="Suggest a nickname..." />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Age</Label>
            <p className="text-xs text-gray-400 mb-1">Current: {character.age || '—'}</p>
            <Input value={usedFields.age ?? ''} onChange={(e) => handleChange('age', e.target.value)} placeholder="Suggest an age..." />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Element</Label>
            <p className="text-xs text-gray-400 mb-1">Current: {character.element || '—'}</p>
            <Input value={usedFields.element ?? ''} onChange={(e) => handleChange('element', e.target.value)} placeholder="Suggest an element..." />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Location</Label>
            <p className="text-xs text-gray-400 mb-1">Current: {character.location || '—'}</p>
            <Input value={usedFields.location ?? ''} onChange={(e) => handleChange('location', e.target.value)} placeholder="Suggest a location..." />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Lore</Label>
            <div className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-200">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-400 font-medium">Current:</span>
                {character.lore && character.lore.length > 100 && (
                  <button
                    onClick={() => setIsLoreExpanded(!isLoreExpanded)}
                    className="text-xs text-teal-500 hover:text-teal-600 font-medium transition-colors"
                  >
                    {isLoreExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
              <div className="mt-1">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {isLoreExpanded ? (character.lore || '—') : lorePreview}
                </p>
              </div>
            </div>
            <textarea
              value={usedFields.lore ?? ''}
              onChange={(e) => handleChange('lore', e.target.value)}
              className="border rounded-lg p-2 text-sm min-h-[120px] resize-y"
              placeholder="Suggest lore content..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Reason (optional)</Label>
            <textarea
              value={usedFields.reason ?? ''}
              onChange={(e) => handleChange('reason', e.target.value)}
              className="border rounded-lg p-2 text-sm min-h-[80px] resize-y"
              placeholder="Why is this change accurate? Source, in-game reference, etc."
            />
          </div>

          <Button onClick={handleSubmit} className="w-full bg-teal-500 hover:bg-teal-600 text-white mt-2">
            Submit Suggestions
          </Button>

        </div>

        {/* FIELD SUBMISSIONS LIST */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">Recent Suggestions</h2>
          <div className="flex flex-col gap-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                onClick={() => setSelectedSubmission(submission)}
                className="bg-white rounded-xl shadow p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-sm font-semibold capitalize">{submission.characters?.name}</p>
                  <p className="text-sm text-gray-600 capitalize truncate">
                    {submission.field_name} : {submission.proposed_value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Submitted by {submission.submitted_by_name ?? 'Anonymous'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button variant={submission.myVote === 'upvote' ? 'default' : 'outline'} onClick={() => handleVote(submission.id, 'upvote')} size="sm">
                    ▲ {submission.upvotes}
                  </Button>
                  <Button variant={submission.myVote === 'downvote' ? 'default' : 'outline'} onClick={() => handleVote(submission.id, 'downvote')} size="sm">
                    ▼ {submission.downvotes}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RELATIONSHIP GRAPH */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-1">Relationships</h2>
          <p className="text-sm text-gray-500 mb-3">
            Click another character to propose a relationship with {character.name}. Solid lines are confirmed, dashed lines are pending community proposals.
          </p>

          <div style={{ width: '100%', height: '500px' }} className="rounded-xl overflow-hidden border bg-white">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              nodesConnectable={false}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>

          {relationshipSubmissions.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-gray-600">Pending Relationship Proposals</p>
              {relationshipSubmissions.map(sub => {
                const targetNode = nodes.find(n => n.id === sub.related_character_id)
                return (
                  <div key={sub.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold">
                        {character.name} → {targetNode?.data.label as string} : <span className="capitalize">{sub.relationship_type.replace('_', ' ')}</span>
                      </p>
                      {sub.description && <p className="text-xs text-gray-500 mt-1">{sub.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant={sub.myVote === 'upvote' ? 'default' : 'outline'} size="sm" onClick={() => handleRelationshipVote(sub.id, 'upvote')}>
                        ▲ {sub.upvotes}
                      </Button>
                      <Button variant={sub.myVote === 'downvote' ? 'default' : 'outline'} size="sm" onClick={() => handleRelationshipVote(sub.id, 'downvote')}>
                        ▼ {sub.downvotes}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* FIELD SUBMISSION DETAIL MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold capitalize">{selectedSubmission.characters?.name}</h2>
                <p className="text-xs text-gray-400 capitalize">{selectedSubmission.field_name}</p>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Current Value</p>
                <p className="text-sm bg-gray-50 rounded-lg p-3 border whitespace-pre-wrap">
                  {selectedSubmission.current_value || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Proposed Value</p>
                <p className="text-sm bg-teal-50 rounded-lg p-3 border border-teal-200 whitespace-pre-wrap">
                  {selectedSubmission.proposed_value}
                </p>
              </div>
              {selectedSubmission.reason && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Reason</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSubmission.reason}</p>
                </div>
              )}
              <p className="text-xs text-gray-400">
                Submitted by {selectedSubmission.submitted_by_name ?? 'Anonymous'}
              </p>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button variant={selectedSubmission.myVote === 'upvote' ? 'default' : 'outline'} size="sm" onClick={() => handleVote(selectedSubmission.id, 'upvote')}>
                  ▲ {selectedSubmission.upvotes}
                </Button>
                <Button variant={selectedSubmission.myVote === 'downvote' ? 'default' : 'outline'} size="sm" onClick={() => handleVote(selectedSubmission.id, 'downvote')}>
                  ▼ {selectedSubmission.downvotes}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RELATIONSHIP PROPOSAL MODAL */}
      {showRelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 w-96 max-w-[90vw]">
            <h2 className="font-bold text-lg">
              Propose: {character.name} ↔ {targetName}
            </h2>

            <div className="space-y-2">
              <Label>Relationship Type</Label>
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
                <SelectTrigger>
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
                <Label>Custom Relationship Type</Label>
                <Input
                  placeholder="Enter custom relationship type"
                  value={customRelationshipType}
                  onChange={(e) => setCustomRelationshipType(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <textarea
                placeholder="Describe the relationship..."
                value={relDescription}
                onChange={(e) => setRelDescription(e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
              />
            </div>

            <div className="flex gap-2 mt-2">
              <Button onClick={handleCancelRelationship} variant="outline" className="flex-1">Cancel</Button>
              <Button
                onClick={handleSubmitRelationship}
                className="flex-1 bg-teal-500 text-white hover:bg-teal-600"
                disabled={isCustomType ? !customRelationshipType : !relationshipType}
              >
                Submit Proposal
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}