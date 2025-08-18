'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Edit3, Trash2, Save, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'

interface Note {
  id: string
  elder_id: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
  author_name?: string
}

interface NotesSectionProps {
  elderId: string
  className?: string
}

export function NotesSection({ elderId, className = '' }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchNotes()
  }, [elderId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      setError('')

      // For now, we'll store notes in a simple notes table
      // In a real implementation, you'd create a proper notes table
      const { data, error } = await supabase
        .from('elder_notes')
        .select(`
          *,
          users!created_by (
            first_name,
            last_name
          )
        `)
        .eq('elder_id', elderId)
        .order('created_at', { ascending: false })

      if (error && error.code !== 'PGRST116') { // Table doesn't exist
        throw error
      }

      const notesWithAuthor = (data || []).map(note => ({
        ...note,
        author_name: note.users 
          ? `${note.users.first_name} ${note.users.last_name}`
          : 'Unknown User'
      }))

      setNotes(notesWithAuthor)
    } catch (err) {
      console.error('Error fetching notes:', err)
      // For MVP, we'll just show empty state if notes table doesn't exist
      setNotes([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setSaving(true)
    setError('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user record
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userRecord) throw new Error('User record not found')

      const { data, error } = await supabase
        .from('elder_notes')
        .insert({
          elder_id: elderId,
          content: newNote.trim(),
          created_by: userRecord.id,
        })
        .select(`
          *,
          users!created_by (
            first_name,
            last_name
          )
        `)
        .single()

      if (error) throw error

      const noteWithAuthor = {
        ...data,
        author_name: data.users 
          ? `${data.users.first_name} ${data.users.last_name}`
          : 'Unknown User'
      }

      setNotes([noteWithAuthor, ...notes])
      setNewNote('')
      setAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setSaving(false)
    }
  }

  const handleEditNote = async (noteId: string) => {
    if (!editContent.trim()) return

    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('elder_notes')
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)

      if (error) throw error

      setNotes(notes.map(note => 
        note.id === noteId 
          ? { ...note, content: editContent.trim(), updated_at: new Date().toISOString() }
          : note
      ))
      setEditing(null)
      setEditContent('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const { error } = await supabase
        .from('elder_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      setNotes(notes.filter(note => note.id !== noteId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note')
    }
  }

  const startEditing = (note: Note) => {
    setEditing(note.id)
    setEditContent(note.content)
  }

  const cancelEditing = () => {
    setEditing(null)
    setEditContent('')
  }

  const cancelAdding = () => {
    setAdding(false)
    setNewNote('')
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-gray-500" />
          Notes
        </h3>
        
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Note
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Add Note Form */}
      {adding && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
                          placeholder="Add a note about this client..."
            disabled={saving}
          />
          
          <div className="flex justify-end space-x-2 mt-3">
            <button
              onClick={cancelAdding}
              disabled={saving}
              className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={saving || !newNote.trim()}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No notes yet</p>
                      <p className="text-sm text-gray-400 mt-1">Add notes to track important information about this client</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="border border-gray-200 rounded-lg p-4">
              {editing === note.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                    disabled={saving}
                  />
                  
                  <div className="flex justify-end space-x-2 mt-3">
                    <button
                      onClick={cancelEditing}
                      disabled={saving}
                      className="p-1 text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditNote(note.id)}
                      disabled={saving || !editContent.trim()}
                      className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                    
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => startEditing(note)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{note.author_name}</span>
                    <span>{formatDateTime(note.created_at)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

