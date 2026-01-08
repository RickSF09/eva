'use client'

import { useState } from 'react'
import { Plus, X, Save, Loader2, ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ElderPreferences } from '@/types/preferences'
import type { Json } from '@/types/database'

interface ElderPreferencesFormProps {
  elderId: string
  initialPreferences: Json | null
  onSave?: () => void
}

const DEFAULT_PREFERENCES: ElderPreferences = {
  favorites: {
    places: [],
    tv_shows: [],
    meals: [],
    hobbies: [],
    topics: [],
  },
  dislikes: {
    topics: [],
    foods: [],
    activities: [],
  },
  struggles: {
    mobility: null,
    memory: null,
    health: null,
    daily_living: null,
    technology: null,
  },
  helpful_things: {
    reminders: [],
    support_needed: [],
    communication_style: null,
  },
  social: {
    family_nearby: null,
    friends_contact_frequency: null,
    feels_lonely: null,
    social_activities: [],
  },
  background: {
    former_occupation: null,
    life_highlights: [],
    important_memories: null,
  },
  summary: '',
}

const StringListInput = ({ 
  items, 
  onChange, 
  label, 
  placeholder = "Add item..." 
}: { 
  items: string[] | null, 
  onChange: (items: string[]) => void,
  label: string,
  placeholder?: string
}) => {
  const list = items || []
  const [newItem, setNewItem] = useState('')

  const handleAdd = () => {
    if (!newItem.trim()) return
    onChange([...list, newItem.trim()])
    setNewItem('')
  }

  const handleRemove = (index: number) => {
    onChange(list.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {list.map((item, idx) => (
          <div key={idx} className="flex items-center bg-slate-100 text-slate-800 text-sm px-2 py-1 rounded-md border border-slate-200">
            <span>{item}</span>
            <button 
              onClick={() => handleRemove(idx)}
              className="ml-1 text-slate-500 hover:text-red-600 focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const StringInput = ({
  value,
  onChange,
  label,
  placeholder
}: {
  value: string | null,
  onChange: (val: string) => void,
  label: string,
  placeholder?: string
}) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
    />
  </div>
)

const BooleanInput = ({
  value,
  onChange,
  label
}: {
  value: boolean | null,
  onChange: (val: boolean) => void,
  label: string
}) => (
  <div className="flex items-center gap-3">
    <label className="text-sm font-medium text-slate-700 min-w-[120px]">{label}</label>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
          value === true 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
          value === false
            ? 'bg-rose-50 border-rose-200 text-rose-700' 
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        No
      </button>
    </div>
  </div>
)

const Section = ({ 
  title, 
  id, 
  isExpanded,
  onToggle,
  children 
}: { 
  title: string, 
  id: string, 
  isExpanded: boolean,
  onToggle: (id: string) => void,
  children: React.ReactNode 
}) => (
  <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 text-left"
    >
      <span className="font-semibold text-slate-800">{title}</span>
      {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
    </button>
    {isExpanded && (
      <div className="p-4 space-y-4">
        {children}
      </div>
    )}
  </div>
)

export function ElderPreferencesForm({ elderId, initialPreferences, onSave }: ElderPreferencesFormProps) {
  const [preferences, setPreferences] = useState<ElderPreferences>(() => {
    if (!initialPreferences) return DEFAULT_PREFERENCES
    // Merge with default to ensure all keys exist
    return {
      ...DEFAULT_PREFERENCES,
      ...(initialPreferences as unknown as Partial<ElderPreferences>),
      favorites: { ...DEFAULT_PREFERENCES.favorites, ...(initialPreferences as any)?.favorites },
      dislikes: { ...DEFAULT_PREFERENCES.dislikes, ...(initialPreferences as any)?.dislikes },
      struggles: { ...DEFAULT_PREFERENCES.struggles, ...(initialPreferences as any)?.struggles },
      helpful_things: { ...DEFAULT_PREFERENCES.helpful_things, ...(initialPreferences as any)?.helpful_things },
      social: { ...DEFAULT_PREFERENCES.social, ...(initialPreferences as any)?.social },
      background: { ...DEFAULT_PREFERENCES.background, ...(initialPreferences as any)?.background },
    }
  })
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setFeedback(null)
      const { error } = await supabase
        .from('elders')
        .update({ preferences: preferences as unknown as Json })
        .eq('id', elderId)

      if (error) throw error
      setFeedback({ type: 'success', message: 'Preferences saved successfully.' })
      if (onSave) onSave()

      // Clear success message after 3 seconds
      setTimeout(() => {
        setFeedback(null)
      }, 3000)
    } catch (error) {
      console.error('Error saving preferences:', error)
      setFeedback({ type: 'error', message: 'Failed to save preferences. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  type PreferenceSection = Exclude<keyof ElderPreferences, 'summary'>

  const updateField = (section: PreferenceSection, field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
    // Clear feedback when user makes changes
    if (feedback) setFeedback(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Preferences <span className="text-sm font-normal text-slate-500">(Optional)</span></h2>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Eva will automatically fill this information during your first call, but you can customize it here if you'd like to make changes.
        </p>
        
        {feedback && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Section title="Favorites" id="favorites" isExpanded={expandedSection === 'favorites'} onToggle={toggleSection}>
          <div className="grid gap-4 md:grid-cols-2">
            <StringListInput 
              label="Topics" 
              items={preferences.favorites.topics} 
              onChange={(val) => updateField('favorites', 'topics', val)} 
            />
            <StringListInput 
              label="Hobbies" 
              items={preferences.favorites.hobbies} 
              onChange={(val) => updateField('favorites', 'hobbies', val)} 
            />
            <StringListInput 
              label="TV Shows" 
              items={preferences.favorites.tv_shows} 
              onChange={(val) => updateField('favorites', 'tv_shows', val)} 
            />
            <StringListInput 
              label="Meals" 
              items={preferences.favorites.meals} 
              onChange={(val) => updateField('favorites', 'meals', val)} 
            />
            <StringListInput 
              label="Places" 
              items={preferences.favorites.places} 
              onChange={(val) => updateField('favorites', 'places', val)} 
            />
          </div>
        </Section>

        <Section title="Dislikes" id="dislikes" isExpanded={expandedSection === 'dislikes'} onToggle={toggleSection}>
          <div className="grid gap-4 md:grid-cols-2">
            <StringListInput 
              label="Topics to Avoid" 
              items={preferences.dislikes.topics} 
              onChange={(val) => updateField('dislikes', 'topics', val)} 
            />
            <StringListInput 
              label="Foods" 
              items={preferences.dislikes.foods} 
              onChange={(val) => updateField('dislikes', 'foods', val)} 
            />
            <StringListInput 
              label="Activities" 
              items={preferences.dislikes.activities} 
              onChange={(val) => updateField('dislikes', 'activities', val)} 
            />
          </div>
        </Section>

        <Section title="Social & Well-being" id="social" isExpanded={expandedSection === 'social'} onToggle={toggleSection}>
          <div className="grid gap-4 md:grid-cols-2">
            <BooleanInput 
              label="Family Nearby" 
              value={preferences.social.family_nearby} 
              onChange={(val) => updateField('social', 'family_nearby', val)} 
            />
            <BooleanInput 
              label="Feels Lonely" 
              value={preferences.social.feels_lonely} 
              onChange={(val) => updateField('social', 'feels_lonely', val)} 
            />
            <StringInput 
              label="Friends Contact Frequency" 
              value={preferences.social.friends_contact_frequency} 
              onChange={(val) => updateField('social', 'friends_contact_frequency', val)} 
            />
            <StringListInput 
              label="Social Activities" 
              items={preferences.social.social_activities} 
              onChange={(val) => updateField('social', 'social_activities', val)} 
            />
          </div>
        </Section>

        <Section title="Daily Life & Struggles" id="struggles" isExpanded={expandedSection === 'struggles'} onToggle={toggleSection}>
          <div className="grid gap-4 md:grid-cols-2">
            <StringInput 
              label="Mobility Issues" 
              value={preferences.struggles.mobility} 
              onChange={(val) => updateField('struggles', 'mobility', val)} 
            />
            <StringInput 
              label="Memory Issues" 
              value={preferences.struggles.memory} 
              onChange={(val) => updateField('struggles', 'memory', val)} 
            />
            <StringInput 
              label="Health Concerns" 
              value={preferences.struggles.health} 
              onChange={(val) => updateField('struggles', 'health', val)} 
            />
            <StringInput 
              label="Daily Living Challenges" 
              value={preferences.struggles.daily_living} 
              onChange={(val) => updateField('struggles', 'daily_living', val)} 
            />
            <StringInput 
              label="Technology Challenges" 
              value={preferences.struggles.technology} 
              onChange={(val) => updateField('struggles', 'technology', val)} 
            />
          </div>
        </Section>

        <Section title="Helpful Things" id="helpful_things" isExpanded={expandedSection === 'helpful_things'} onToggle={toggleSection}>
          <div className="grid gap-4 md:grid-cols-2">
            <StringInput 
              label="Communication Style" 
              value={preferences.helpful_things.communication_style} 
              onChange={(val) => updateField('helpful_things', 'communication_style', val)} 
            />
            <StringListInput 
              label="Preferred Reminders" 
              items={preferences.helpful_things.reminders} 
              onChange={(val) => updateField('helpful_things', 'reminders', val)} 
            />
            <StringListInput 
              label="Support Needed" 
              items={preferences.helpful_things.support_needed} 
              onChange={(val) => updateField('helpful_things', 'support_needed', val)} 
            />
          </div>
        </Section>

        <Section title="Background" id="background" isExpanded={expandedSection === 'background'} onToggle={toggleSection}>
          <div className="grid gap-4">
            <StringInput 
              label="Former Occupation" 
              value={preferences.background.former_occupation} 
              onChange={(val) => updateField('background', 'former_occupation', val)} 
            />
            <StringInput 
              label="Important Memories" 
              value={preferences.background.important_memories} 
              onChange={(val) => updateField('background', 'important_memories', val)} 
            />
            <StringListInput 
              label="Life Highlights" 
              items={preferences.background.life_highlights} 
              onChange={(val) => updateField('background', 'life_highlights', val)} 
            />
          </div>
        </Section>
      </div>
    </div>
  )
}
