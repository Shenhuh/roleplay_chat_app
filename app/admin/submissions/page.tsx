'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

export default function SubmissionsReviewPage() {
  const [expandedField, setExpandedField] = useState<string | null>(null)
  const [fieldSubmissions, setFieldSubmissions] = useState<any[]>([])
  const [relationshipSubmissions, setRelationshipSubmissions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'fields' | 'relationships'>('fields')

  async function loadFieldSubmissions() {
    const { data } = await supabase
      .from('character_field_submissions')
      .select('*, characters(name)')
      .eq('status', 'pending')

    setFieldSubmissions(data ?? [])
  }

  async function loadRelationshipSubmissions() {
    const { data } = await supabase
      .from('character_relationship_submissions')
      .select(`
        *,
        character:characters!character_relationship_submissions_character_id_fkey(name),
        related_character:characters!character_relationship_submissions_related_character_id_fkey(name)
      `)
      .eq('status', 'pending')

    setRelationshipSubmissions(data ?? [])
  }

  useEffect(() => {
    loadFieldSubmissions()
    loadRelationshipSubmissions()
  }, [])

  // ---- FIELD SUBMISSIONS GROUPING ----
  const grouped: Record<string, typeof fieldSubmissions> = {}

  fieldSubmissions.forEach(fieldSubmission => {
    const key = `${fieldSubmission.character_id}-${fieldSubmission.field_name}`
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(fieldSubmission)
  })

  const groupedList = Object.entries(grouped).map(([key, submissions]) => ({
    key,
    characterName: submissions[0].characters?.name,
    fieldName: submissions[0].field_name,
    count: submissions.length,
    topVotes: Math.max(...submissions.map(s => s.upvotes ?? 0)),
    submissions
  }))

  const activeGroup = groupedList.find(g => g.key === expandedField)

  // ---- FIELD APPROVE / REJECT ----
  async function handleApproveField(submission: any, finalValue: string) {
    await supabase
      .from('characters')
      .update({ [submission.field_name]: finalValue })
      .eq('id', submission.character_id)

    await supabase
      .from('character_field_submissions')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', submission.id)

    setFieldSubmissions(prev => prev.filter(s => s.id !== submission.id))
  }

  async function handleRejectField(submission: any) {
    await supabase
      .from('character_field_submissions')
      .update({ status: 'rejected' })
      .eq('id', submission.id)

    setFieldSubmissions(prev => prev.filter(s => s.id !== submission.id))
  }

  // ---- RELATIONSHIP APPROVE / REJECT ----
  async function handleApproveRelationship(submission: any) {
    await supabase
      .from('character_relationships')
      .insert({
        character_id: submission.character_id,
        related_character_id: submission.related_character_id,
        relationship_type: submission.relationship_type,
        description: submission.description
      })

    await supabase
      .from('character_relationship_submissions')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', submission.id)

    setRelationshipSubmissions(prev => prev.filter(s => s.id !== submission.id))
  }

  async function handleRejectRelationship(submission: any) {
    await supabase
      .from('character_relationship_submissions')
      .update({ status: 'rejected' })
      .eq('id', submission.id)

    setRelationshipSubmissions(prev => prev.filter(s => s.id !== submission.id))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Pending Submissions</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('fields')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'fields' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}
        >
          Field Changes ({groupedList.length})
        </button>
        <button
          onClick={() => setActiveTab('relationships')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'relationships' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}
        >
          Relationships ({relationshipSubmissions.length})
        </button>
      </div>

      {/* FIELD SUBMISSIONS TABLE */}
      {activeTab === 'fields' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="p-3">Character</th>
                <th className="p-3">Field</th>
                <th className="p-3">Submissions</th>
                <th className="p-3">Top Votes</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {groupedList.map(group => (
                <tr key={group.key} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{group.characterName}</td>
                  <td className="p-3">
                    <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-full uppercase tracking-wide">
                      {group.fieldName}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{group.count} proposal{group.count > 1 ? 's' : ''}</td>
                  <td className="p-3 text-gray-500">▲ {group.topVotes}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setExpandedField(group.key)}
                      className="text-teal-500 font-medium hover:underline"
                    >
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
              {groupedList.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No pending field submissions.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* RELATIONSHIP SUBMISSIONS LIST */}
      {activeTab === 'relationships' && (
        <div className="flex flex-col gap-3">
          {relationshipSubmissions.length === 0 && (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400">No pending relationship proposals.</div>
          )}
          {relationshipSubmissions.map(submission => (
            <div key={submission.id} className="bg-white rounded-xl shadow p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold">
                  {submission.character?.name} → {submission.related_character?.name} : <span className="capitalize text-teal-600">{submission.relationship_type}</span>
                </p>
                <span className="text-xs text-gray-400">by {submission.submitted_by_name ?? 'Anonymous'}</span>
              </div>
              {submission.description && (
                <p className="text-sm text-gray-600">{submission.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">▲ {submission.upvotes ?? 0} ▼ {submission.downvotes ?? 0}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRejectRelationship(submission)}
                    className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-200"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveRelationship(submission)}
                    className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-600"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FIELD DETAIL MODAL */}
      {activeGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">

            <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-bold">{activeGroup.characterName} — {activeGroup.fieldName}</h2>
                <p className="text-xs text-gray-400">{activeGroup.count} pending proposals</p>
              </div>
              <button onClick={() => setExpandedField(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">

              <CollapsibleBlock label="Current Value" defaultOpen={false}>
                {activeGroup.submissions[0]?.current_value ?? '—'}
              </CollapsibleBlock>

              <hr className="border-gray-100" />

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proposals</p>

              {activeGroup.submissions
                .sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0))
                .map(submission => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    onApprove={handleApproveField}
                    onReject={handleRejectField}
                  />
                ))}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SubmissionCard({ submission, onApprove, onReject }: {
  submission: any
  onApprove: (submission: any, finalValue: string) => void
  onReject: (submission: any) => void
}) {
  const [value, setValue] = useState(submission.proposed_value)

  return (
    <div className="border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Proposed Value (editable before approving)</label>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border rounded-lg p-2 text-sm min-h-[100px] resize-y bg-white"
        />
      </div>

      <div className="text-xs text-gray-500">
        <span className="font-medium">Reason:</span> {submission.reason ?? '—'}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>▲ {submission.upvotes ?? 0}</span>
          <span>▼ {submission.downvotes ?? 0}</span>
          <span className="text-xs text-gray-400">by {submission.submitted_by_name ?? 'Anonymous'}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onReject(submission)}
            className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-200"
          >
            Reject
          </button>
          <button
            onClick={() => onApprove(submission, value)}
            className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-600"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}

function CollapsibleBlock({ label, children, defaultOpen }: { label: string, children: React.ReactNode, defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center p-3 text-xs font-medium text-gray-500"
      >
        {label}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <p className="text-sm text-gray-700 px-3 pb-3 whitespace-pre-wrap">
          {children}
        </p>
      )}
    </div>
  )
}