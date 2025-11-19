'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Clock, Calendar, Edit2, X, Trash2, Plus, Phone, User, GripVertical } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { EmergencyContactForm } from '@/components/emergency/EmergencyContactForm'
import type { TablesInsert } from '@/types/database'
import {
  composeE164,
  detectCountryCodeFromE164,
  getNationalNumber,
  sanitizeDigits,
  validateE164,
  type SupportedCountryCode,
} from '@/lib/phone'
import { calculateNextScheduledTime } from '@/lib/utils'
import { Tables } from '@/types/database'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Elder = Tables<'elders'>

type ElderFormState = Pick<
  TablesInsert<'elders'>,
  'first_name' | 'last_name' | 'phone' | 'address' | 'medical_conditions' | 'medications' | 'personal_info'
>

type Feedback = { type: 'success' | 'error'; message: string } | null
type ScheduleFrequency = 'daily' | 'custom'

interface ScheduleFormState {
  name: string
  description: string
  frequency: ScheduleFrequency
  days: number[]
  times: string[]
  retryAfter: number
  maxRetries: number
  topics: string[]
}

interface ScheduleSummary {
  id: string
  name: string
  frequency: string
  call_times: string[]
  days_of_week: number[] | null
  retry_after_minutes: number | null
  max_retries: number | null
  description?: string | null
  checklist?: string[] | null
}

interface EmergencyContact {
  id: string
  name: string
  phone: string
  active: boolean
  created_at: string
  updated_at: string
  elder_assignments?: ElderAssignment[]
  relation?: string
}

interface ElderAssignment {
  id: string
  elder_id: string
  emergency_contact_id: string
  "priority order": number
  relation: string
  elder: Elder
}

const DEFAULT_ELDER: ElderFormState = {
  first_name: '',
  last_name: '',
  phone: '',
  address: '',
  medical_conditions: '',
  medications: '',
  personal_info: '',
}

const DEFAULT_SCHEDULE: ScheduleFormState = {
  name: 'Daily Check-in',
  description: '',
  frequency: 'daily',
  days: [0, 1, 2, 3, 4, 5, 6],
  times: ['09:00'],
  retryAfter: 30,
  maxRetries: 2,
  topics: [],
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const COMMON_CHECKLIST_ITEMS = [
  'Taken medication',
  'Feeling well',
  'Eaten today',
  'Had water',
  'Moved around',
  'Feeling safe',
  'No pain',
  'Sleeping well',
]

export default function B2CElderPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  const [form, setForm] = useState<ElderFormState>(DEFAULT_ELDER)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [elderId, setElderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState<SupportedCountryCode>('+44')

  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(DEFAULT_SCHEDULE)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([])
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null)

  // Emergency contacts state
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [showAddEmergencyContact, setShowAddEmergencyContact] = useState(false)
  const [editingEmergencyContact, setEditingEmergencyContact] = useState<EmergencyContact | null>(null)

  // Country code detection handled via detectCountryCodeFromE164 from '@/lib/phone'

  const nationalNumber = useMemo(() => {
    return getNationalNumber(form.phone, countryCode)
  }, [form.phone, countryCode])

  // E.164 validation handled via validateE164 from '@/lib/phone'

  useEffect(() => {
    if (!user) return

    let active = true
    setLoading(true)

    const load = async () => {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!active || !profile) return

        setProfileId(profile.id)

        const { data: elder } = await supabase
          .from('elders')
          .select('id, first_name, last_name, phone, address, medical_conditions, medications, personal_info')
          .eq('user_id', profile.id)
          .single()

        if (!active) return

        if (elder) {
          setElderId(elder.id)
          setForm({
            first_name: elder.first_name,
            last_name: elder.last_name,
            phone: elder.phone ?? '',
            address: elder.address ?? '',
            medical_conditions: elder.medical_conditions ?? '',
            medications: elder.medications ?? '',
            personal_info: elder.personal_info ?? '',
          })
          setCountryCode(detectCountryCodeFromE164(elder.phone))
          setPhoneError(null)
          fetchSchedules(elder.id)
          fetchEmergencyContacts(elder.id)
        } else {
          setElderId(null)
          setForm(DEFAULT_ELDER)
          setCountryCode('+44')
          setPhoneError(null)
          setSchedules([])
          setEmergencyContacts([])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [user])

  const fetchSchedules = async (targetElderId?: string) => {
    const id = targetElderId ?? elderId
    if (!id) return

    try {
      setScheduleLoading(true)
      const { data, error } = await supabase
        .from('elder_call_schedules')
        .select(`
          schedule_id,
          call_schedules (
            id,
            name,
            description,
            frequency,
            call_times,
            days_of_week,
            retry_after_minutes,
            max_retries,
            checklist
          )
        `)
        .eq('elder_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const summaries: ScheduleSummary[] = (data ?? [])
        .map((row: any) => {
          const schedule = Array.isArray(row.call_schedules)
            ? row.call_schedules[0]
            : row.call_schedules
          if (!schedule) return null
          return {
            id: schedule.id as string,
            name: schedule.name as string,
            description: schedule.description ?? null,
            frequency: schedule.frequency as string,
            call_times: Array.isArray(schedule.call_times) ? schedule.call_times : [],
            days_of_week: Array.isArray(schedule.days_of_week) ? schedule.days_of_week : null,
            retry_after_minutes: schedule.retry_after_minutes ?? null,
            max_retries: schedule.max_retries ?? null,
            checklist: Array.isArray(schedule.checklist) ? schedule.checklist : null,
          } as ScheduleSummary
        })
        .filter((item): item is ScheduleSummary => item !== null)

      setSchedules(summaries)
    } catch (error) {
      console.error('Failed to load schedules', error)
      setSchedules([])
    } finally {
      setScheduleLoading(false)
    }
  }

  // Helper to get display name
  const getDisplayName = () => {
    return form.first_name.trim() || 'Profile'
  }

  const handleFieldChange = (field: Exclude<keyof ElderFormState, 'phone'>) =>
    (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement
      setForm((prev) => ({ ...prev, [field]: target.value }))
      setFeedback(null)
    }

  const handlePhoneDigitsChange = (event: FormEvent<HTMLInputElement>) => {
    const digits = sanitizeDigits((event.target as HTMLInputElement).value)
    const full = composeE164(countryCode, digits)
    setForm((prev) => ({ ...prev, phone: full }))
    setFeedback(null)
    setPhoneError(full ? validateE164(full, countryCode) : 'Phone number is required')
  }

  const handleCountryChange = (event: FormEvent<HTMLSelectElement>) => {
    const nextCode = (event.target as HTMLSelectElement).value as SupportedCountryCode
    setCountryCode(nextCode)
    const digits = sanitizeDigits(getNationalNumber(form.phone, detectCountryCodeFromE164(form.phone, nextCode)))
    const full = composeE164(nextCode, digits)
    setForm((prev) => ({ ...prev, phone: full }))
    setPhoneError(full ? validateE164(full, nextCode) : 'Phone number is required')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) {
      router.replace('/login')
      return
    }

    let targetProfileId = profileId
    if (!targetProfileId) {
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!profile?.id) {
        setFeedback({ type: 'error', message: 'We could not find your profile record. Please contact support.' })
        return
      }

      targetProfileId = profile.id
      setProfileId(profile.id)
    }

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFeedback({ type: 'error', message: 'Please provide first and last name.' })
      return
    }

    const validationError = validateE164(form.phone, countryCode)
    if (validationError) {
      setPhoneError(validationError)
      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      const payload = {
        ...form,
        user_id: targetProfileId,
        id: elderId ?? undefined,
        active: true,
      }

      console.log('Submitting elder payload', { elderId, payload })

      if (elderId) {
        const { error } = await supabase.from('elders').update(payload).eq('id', elderId)
        if (error) throw error
        setFeedback({ type: 'success', message: 'Details updated.' })
      } else {
        const { data, error } = await supabase
          .from('elders')
          .insert(payload)
          .select('id')
          .single()

        if (error) throw error
        setElderId(data.id)
        setFeedback({
          type: 'success',
          message: `${form.first_name.trim() || 'Profile'} created successfully. Next, set up their call schedule below.`,
        })
        fetchSchedules(data.id)
      }
    } catch (error) {
      console.error('Failed to save elder', error)
      setFeedback({ type: 'error', message: 'We could not save the information. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const updateScheduleForm = (patch: Partial<ScheduleFormState>) => {
    setScheduleForm((prev) => ({ ...prev, ...patch }))
  }

  const addScheduleTime = () => {
    setScheduleForm((prev) => ({ ...prev, times: [...prev.times, '09:00'] }))
  }

  const removeScheduleTime = (index: number) => {
    setScheduleForm((prev) => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index),
    }))
  }

  const updateScheduleTime = (index: number, time: string) => {
    setScheduleForm((prev) => {
      const times = [...prev.times]
      times[index] = time
      return { ...prev, times }
    })
  }

  const toggleScheduleDay = (day: number) => {
    setScheduleForm((prev) => {
      const selected = prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day]
      return { ...prev, days: selected.sort() }
    })
  }

  const addScheduleTopic = () => {
    setScheduleForm((prev) => ({ ...prev, topics: [...prev.topics, ''] }))
  }

  const addQuickChecklistItem = (item: string) => {
    setScheduleForm((prev) => {
      // Don't add if it already exists (case-insensitive)
      const alreadyExists = prev.topics.some(
        (topic) => topic.trim().toLowerCase() === item.trim().toLowerCase()
      )
      if (alreadyExists) return prev
      return { ...prev, topics: [...prev.topics, item] }
    })
  }

  const removeScheduleTopic = (index: number) => {
    setScheduleForm((prev) => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index),
    }))
  }

  const updateScheduleTopic = (index: number, value: string) => {
    setScheduleForm((prev) => {
      const topics = [...prev.topics]
      topics[index] = value
      return { ...prev, topics }
    })
  }

  const handleEditSchedule = (schedule: ScheduleSummary) => {
    setEditingScheduleId(schedule.id)
    setScheduleForm({
      name: schedule.name,
      description: schedule.description || '',
      frequency: schedule.frequency as ScheduleFrequency,
      days: schedule.days_of_week || [0, 1, 2, 3, 4, 5, 6],
      times: schedule.call_times,
      retryAfter: schedule.retry_after_minutes ?? 30,
      maxRetries: schedule.max_retries ?? 2,
      topics: schedule.checklist || [],
    })
    setScheduleSuccess(null)
    setScheduleError(null)
    setShowScheduleForm(true)
  }

  const handleCancelEdit = () => {
    setEditingScheduleId(null)
    setScheduleForm(DEFAULT_SCHEDULE)
    setScheduleSuccess(null)
    setScheduleError(null)
    setShowScheduleForm(false)
  }

  const handleShowNewScheduleForm = () => {
    setEditingScheduleId(null)
    setScheduleForm(DEFAULT_SCHEDULE)
    setScheduleSuccess(null)
    setScheduleError(null)
    setShowScheduleForm(true)
  }

  const handleCreateSchedule = async (event: FormEvent) => {
    event.preventDefault()
    if (!elderId) {
      setScheduleError(`Save ${getDisplayName()}'s details before creating a schedule.`)
      return
    }

    const times = scheduleForm.times.filter(Boolean)
    if (times.length === 0) {
      setScheduleError('Add at least one call time.')
      return
    }

    if (!scheduleForm.description || !scheduleForm.description.trim()) {
      setScheduleError('Please provide a description for the schedule.')
      return
    }

    setScheduleSaving(true)
    setScheduleSuccess(null)
    setScheduleError(null)

    try {
      const checklist = scheduleForm.topics
        .map((item) => item.trim())
        .filter(Boolean)

      // Always send days_of_week. Derive frequency: all 7 days => 'daily', otherwise 'custom'
      const derivedFrequency: ScheduleFrequency =
        scheduleForm.days.length === 7 ? 'daily' : 'custom'

      if (editingScheduleId) {
        // Update existing schedule
        const { error: updateError } = await supabase
          .from('call_schedules')
          .update({
            name: scheduleForm.name.trim() || 'Daily Check-in',
            description: scheduleForm.description.trim(),
            frequency: derivedFrequency,
            call_times: times,
            days_of_week: scheduleForm.days.sort(),
            checklist,
            retry_after_minutes: scheduleForm.retryAfter,
            max_retries: scheduleForm.maxRetries,
          })
          .eq('id', editingScheduleId)

        if (updateError) throw updateError

        // Delete existing pending call_executions and create a new one with updated schedule
        const { error: deleteExecutionsError } = await supabase
          .from('call_executions')
          .delete()
          .eq('elder_id', elderId)
          .eq('schedule_id', editingScheduleId)
          .eq('status', 'pending')

        if (deleteExecutionsError) {
          console.error('Failed to delete old call executions:', deleteExecutionsError)
          // Don't throw here as the schedule was updated successfully
        }

        // Create new call_execution with updated schedule
        const nextScheduledTime = calculateNextScheduledTime(scheduleForm.days, times)

        if (nextScheduledTime) {
          const { error: executionError } = await supabase
            .from('call_executions')
            .insert({
              elder_id: elderId,
              schedule_id: editingScheduleId,
              call_type: 'scheduled',
              status: 'pending',
              scheduled_for: nextScheduledTime.toISOString(),
            })

          if (executionError) {
            console.error('Failed to create call execution:', executionError)
            // Don't throw here as the schedule was updated successfully
          }
        }

        setScheduleSuccess('Schedule updated successfully.')
        setEditingScheduleId(null)
        setScheduleForm(DEFAULT_SCHEDULE)
        setShowScheduleForm(false)
        fetchSchedules(elderId)
      } else {
        // Create new schedule
        const { data: schedule, error: scheduleError } = await supabase
          .from('call_schedules')
          .insert({
            name: scheduleForm.name.trim() || 'Daily Check-in',
            description: scheduleForm.description.trim(),
            frequency: derivedFrequency,
            call_times: times,
            days_of_week: scheduleForm.days.sort(),
            checklist,
            retry_after_minutes: scheduleForm.retryAfter,
            max_retries: scheduleForm.maxRetries,
            active: true,
            org_id: null,
            schedule_type: 'b2c',
          })
          .select('id')
          .single()

        if (scheduleError) throw scheduleError

        const { error: linkError } = await supabase
          .from('elder_call_schedules')
          .insert({ elder_id: elderId, schedule_id: schedule.id, active: true })

        if (linkError) throw linkError

        // Create call_execution to start the calling sequence
        const nextScheduledTime = calculateNextScheduledTime(scheduleForm.days, times)

        if (nextScheduledTime) {
          const { error: executionError } = await supabase
            .from('call_executions')
            .insert({
              elder_id: elderId,
              schedule_id: schedule.id,
              call_type: 'scheduled',
              status: 'pending',
              scheduled_for: nextScheduledTime.toISOString(),
            })

          if (executionError) {
            console.error('Failed to create call execution:', executionError)
            // Don't throw here as the schedule was created successfully
          }
        }

        setScheduleSuccess('Schedule created and linked. Calls will now follow this plan.')
        setScheduleForm(DEFAULT_SCHEDULE)
        setShowScheduleForm(false)
        fetchSchedules(elderId)
      }
    } catch (error) {
      console.error('Failed to save schedule', error)
      setScheduleError('We could not save the schedule. Please try again.')
    } finally {
      setScheduleSaving(false)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!elderId) return

    if (!confirm('Are you sure you want to delete this schedule? This will stop all future calls for this schedule.')) {
      return
    }

    setDeletingScheduleId(scheduleId)
    setScheduleError(null)

    try {
      // Find the elder_call_schedules link
      const { data: links, error: linkFetchError } = await supabase
        .from('elder_call_schedules')
        .select('id')
        .eq('elder_id', elderId)
        .eq('schedule_id', scheduleId)

      if (linkFetchError) throw linkFetchError

      // Delete the link(s)
      if (links && links.length > 0) {
        const { error: deleteLinkError } = await supabase
          .from('elder_call_schedules')
          .delete()
          .in('id', links.map(l => l.id))

        if (deleteLinkError) throw deleteLinkError
      }

      // Delete pending call_executions for this schedule
      const { error: deleteExecutionsError } = await supabase
        .from('call_executions')
        .delete()
        .eq('elder_id', elderId)
        .eq('schedule_id', scheduleId)
        .eq('status', 'pending')

      if (deleteExecutionsError) {
        console.error('Failed to delete call executions:', deleteExecutionsError)
        // Don't throw here as the schedule link was deleted successfully
      }

      // Optionally delete the schedule itself if it's b2c and not used elsewhere
      // For now, we'll just mark it as inactive or leave it
      // The schedule can be reused if needed

      setScheduleSuccess('Schedule deleted successfully.')
      fetchSchedules(elderId)
    } catch (error) {
      console.error('Failed to delete schedule', error)
      setScheduleError('We could not delete the schedule. Please try again.')
    } finally {
      setDeletingScheduleId(null)
    }
  }

  const fetchEmergencyContacts = async (targetElderId: string) => {
    try {
      // Fetch emergency contacts linked to this elder
      const { data: assignments, error: assignmentsError } = await supabase
        .from('elder_emergency_contact')
        .select(`
          id,
          elder_id,
          emergency_contact_id,
          "priority order",
          relation,
          emergency_contacts (
            id,
            name,
            phone,
            active,
            created_at,
            updated_at
          )
        `)
        .eq('elder_id', targetElderId)
        .order('"priority order"')

      if (assignmentsError) throw assignmentsError

      // Transform the data
      const transformedContacts: EmergencyContact[] = (assignments || [])
        .map((assignment: any) => {
          const contact = Array.isArray(assignment.emergency_contacts)
            ? assignment.emergency_contacts[0]
            : assignment.emergency_contacts

          if (!contact) return null

          return {
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            active: contact.active ?? true,
            created_at: contact.created_at,
            updated_at: contact.updated_at,
            elder_assignments: [{
              id: assignment.id,
              elder_id: assignment.elder_id,
              emergency_contact_id: assignment.emergency_contact_id,
              "priority order": assignment["priority order"],
              relation: assignment.relation,
              elder: {
                id: assignment.elder_id,
                first_name: form.first_name,
                last_name: form.last_name,
                phone: form.phone,
              } as Elder
            }]
          } as EmergencyContact
        })
        .filter((contact): contact is EmergencyContact => contact !== null)

      setEmergencyContacts(transformedContacts)
    } catch (err) {
      console.error('Error fetching emergency contacts:', err)
    }
  }

  const handleEmergencyContactAdded = () => {
    setShowAddEmergencyContact(false)
    if (elderId) {
      fetchEmergencyContacts(elderId)
    }
  }

  const handleEmergencyContactEdited = () => {
    setEditingEmergencyContact(null)
    if (elderId) {
      fetchEmergencyContacts(elderId)
    }
  }

  const handleEditEmergencyContact = (contact: EmergencyContact) => {
    setEditingEmergencyContact(contact)
    setShowAddEmergencyContact(false)
  }

  const handleDeleteEmergencyContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this emergency contact?')) return

    try {
      // Delete the assignment first
      const { error: assignmentError } = await supabase
        .from('elder_emergency_contact')
        .delete()
        .eq('emergency_contact_id', contactId)

      if (assignmentError) throw assignmentError

      // Then delete the contact
      const { error: contactError } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId)

      if (contactError) throw contactError

      if (elderId) {
        fetchEmergencyContacts(elderId)
      }
    } catch (err) {
      console.error('Error deleting emergency contact:', err)
      alert('Failed to delete emergency contact. Please try again.')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !elderId) {
      return
    }

    const oldIndex = emergencyContacts.findIndex((contact) => contact.id === active.id)
    const newIndex = emergencyContacts.findIndex((contact) => contact.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Reorder the contacts in state
    const reorderedContacts = arrayMove(emergencyContacts, oldIndex, newIndex)
    
    // Update priority order in local state immediately
    const updatedContacts = reorderedContacts.map((contact, index) => {
      const newPriority = index + 1
      return {
        ...contact,
        elder_assignments: contact.elder_assignments?.map((assignment) => ({
          ...assignment,
          "priority order": newPriority,
        })),
      }
    })
    
    setEmergencyContacts(updatedContacts)

    // Update priorities in database
    try {
      // Update all priorities sequentially (1, 2, 3, etc.)
      const updates = updatedContacts
        .map((contact, index) => {
          const assignmentId = contact.elder_assignments?.[0]?.id
          if (!assignmentId) return null

          return supabase
            .from('elder_emergency_contact')
            .update({ "priority order": index + 1 })
            .eq('id', assignmentId)
            .then(() => null) // Convert to Promise
        })
        .filter((update): update is Promise<null> => update !== null)

      // Execute all updates
      await Promise.all(updates)
    } catch (err) {
      console.error('Error updating priorities:', err)
      // Revert on error
      fetchEmergencyContacts(elderId)
      alert('Failed to update priorities. Please try again.')
    }
  }

  // Sortable Contact Item Component
  const SortableContactItem = ({ contact }: { contact: EmergencyContact }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: contact.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }
    const isEditingThisContact = editingEmergencyContact?.id === contact.id

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-lg border p-4 hover:shadow-md transition-shadow ${
          isDragging ? 'shadow-lg' : ''
        } ${isEditingThisContact ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white'}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center flex-1 min-w-0">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing mr-3 p-1 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
              <User className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate">{contact.name}</h4>
              <div className="flex items-center text-xs text-slate-600 mt-1">
                <Phone className="w-3 h-3 mr-1 text-slate-400 flex-shrink-0" />
                <span className="truncate">{contact.phone}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button
              onClick={() => handleEditEmergencyContact(contact)}
              className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition"
              title="Edit Contact"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => handleDeleteEmergencyContact(contact.id)}
              className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
              title="Delete Contact"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Assignment Info */}
        {contact.elder_assignments && contact.elder_assignments.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Relation:</span>
              <span className="text-slate-700 font-medium">
                {contact.elder_assignments![0].relation}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500">Priority:</span>
              <span className="text-slate-700 font-medium">
                {contact.elder_assignments![0]["priority order"]}
              </span>
            </div>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            contact.active
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-50 text-slate-700'
          }`}>
            {contact.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {isEditingThisContact && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <AlertCircle className="h-4 w-4 flex-none text-slate-500" />
            <span>Editing this contact. Make changes below and save.</span>
          </div>
        )}
      </div>
    )
  }

  // Set up drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="h-full animate-pulse rounded-md bg-slate-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{form.first_name.trim() ? `${form.first_name}'s Information` : 'Profile Information'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add details about {getDisplayName()} so our team can personalise check-ins and respond quickly during emergencies.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            First name
            <input
              required
              value={form.first_name}
              onInput={handleFieldChange('first_name')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Last name
            <input
              required
              value={form.last_name}
              onInput={handleFieldChange('last_name')}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Phone number
            <div className="flex rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-slate-200">
              <select
                value={countryCode}
                onInput={handleCountryChange}
                className="rounded-l-lg border-0 border-r border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-slate-300 focus:outline-none"
              >
                <option value="+1">🇺🇸 +1</option>
                <option value="+31">🇳🇱 +31</option>
                <option value="+44">🇬🇧 +44</option>
              </select>
              <input
                value={nationalNumber}
                onInput={handlePhoneDigitsChange}
                type="tel"
                placeholder={countryCode === '+1' ? '5551234567' : countryCode === '+31' ? '612345678' : '7123456789'}
                className="flex-1 rounded-r-lg border-0 px-3 py-2 text-slate-900 focus:outline-none"
                required
              />
            </div>
            {phoneError && <p className="text-xs text-rose-600">{phoneError}</p>}
            <p className="text-xs text-slate-500">Example: {countryCode}123456789 (no spaces or punctuation).</p>
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600">
            Address
            <input
              value={form.address ?? ''}
              onInput={handleFieldChange('address')}
              placeholder="123 Main Street, Springfield"
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Medications
          <textarea
            value={form.medications ?? ''}
            onInput={handleFieldChange('medications')}
            rows={3}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Medical notes
          <textarea
            value={form.medical_conditions ?? ''}
            onInput={handleFieldChange('medical_conditions')}
            rows={3}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Personal information
          <textarea
            value={form.personal_info ?? ''}
            onInput={handleFieldChange('personal_info')}
            rows={3}
            placeholder="Preferred name, routines, hobbies, favourite people..."
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Your updates sync instantly with our care team.</span>
          <button
            type="submit"
            disabled={saving || !!phoneError}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {feedback && (
          <div
            className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 flex-none" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-none" />
            )}
            <span className="font-medium leading-5">{feedback.message}</span>
          </div>
        )}
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-900">Call Scheduling</h2>
            </div>
          <p className="text-sm text-slate-600">
            Create one or more schedules so Eva knows when to place automated check-in calls. You can edit or add more later.
          </p>
        </div>

        {!elderId && (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <AlertCircle className="h-5 w-5 flex-none text-slate-500" />
            Save {getDisplayName()}'s details first, then you can add schedules.
          </div>
        )}

        {elderId && (
          <>
            {scheduleSuccess && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <CheckCircle2 className="h-5 w-5 flex-none" />
                <span>{scheduleSuccess}</span>
              </div>
            )}

            {scheduleError && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <AlertCircle className="h-5 w-5 flex-none" />
                <span>{scheduleError}</span>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Existing schedules</h3>
              {scheduleLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-slate-400" />
                  Loading schedules…
                </div>
              ) : schedules.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  No schedules yet. Add your first plan below to start calls.
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`rounded-xl border px-4 py-3 transition ${
                        editingScheduleId === schedule.id
                          ? 'border-slate-400 bg-slate-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{schedule.name}</p>
                          <p className="text-xs text-slate-500">
                            {schedule.frequency === 'daily' ? 'Daily' : 'Selected days'} · Calls at {schedule.call_times.join(', ')}
                          </p>
                          {schedule.description && (
                            <p className="mt-1 text-xs text-slate-600">{schedule.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1 text-xs text-slate-500">
                            <span>Retries: {schedule.max_retries ?? 0}</span>
                            <span>Retry: {schedule.retry_after_minutes ?? 30}m</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditSchedule(schedule)}
                              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                              title="Edit schedule"
                              disabled={deletingScheduleId === schedule.id}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
                              title="Delete schedule"
                              disabled={deletingScheduleId === schedule.id}
                            >
                              {deletingScheduleId === schedule.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      {editingScheduleId === schedule.id && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700">
                          <AlertCircle className="h-4 w-4 flex-none text-slate-500" />
                          <span>Editing this schedule. Make changes below and save.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!showScheduleForm && !editingScheduleId && (
              <button
                type="button"
                onClick={handleShowNewScheduleForm}
                className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-4 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition"
              >
                + Create New Schedule
              </button>
            )}

            {showScheduleForm && (
              <form onSubmit={handleCreateSchedule} className="space-y-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingScheduleId ? 'Edit Schedule' : 'Create New Schedule'}
                </h3>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Schedule name</p>
                <input
                  value={scheduleForm.name}
                  onChange={(event) => updateScheduleForm({ name: event.target.value })}
                  placeholder="Morning Check-in"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const selected = scheduleForm.days.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleScheduleDay(day.value)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                        selected
                          ? 'border-blue-500 bg-blue-600 text-white shadow-sm ring-2 ring-blue-200'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {day.label}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Call time(s)</p>
                <div className="space-y-2">
                  {scheduleForm.times.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(event) => updateScheduleTime(index, event.target.value)}
                        className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        required
                      />
                      {scheduleForm.times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeScheduleTime(index)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {scheduleForm.times.length < 4 && (
                  <button
                    type="button"
                    onClick={addScheduleTime}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    + Add another time
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Checklist items</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Add specific items for Eva to verify during the call. She'll ask about each one and track completion in the call report.
                  </p>
                </div>

                {/* Current checklist items */}
                <div className="space-y-2">
                  {scheduleForm.topics.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-500">
                      No items added yet. Add a custom item below or use the quick-add options.
                    </div>
                  ) : (
                    scheduleForm.topics.map((topic, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={topic}
                          onChange={(event) => updateScheduleTopic(index, event.target.value)}
                          placeholder="e.g. Taken medication"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeScheduleTopic(index)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
                          title="Remove item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add custom item button */}
                <button
                  type="button"
                  onClick={addScheduleTopic}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  + Add custom item
                </button>

                {/* Quick-add suggestions */}
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">Quick add:</p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_CHECKLIST_ITEMS.map((item) => {
                      const isAdded = scheduleForm.topics.some(
                        (topic) => topic.trim().toLowerCase() === item.trim().toLowerCase()
                      )
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => addQuickChecklistItem(item)}
                          disabled={isAdded}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                            isAdded
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 cursor-default'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {isAdded && <CheckCircle2 className="h-3 w-3" />}
                          {item}
                          {!isAdded && <span className="text-slate-400">+</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Retry settings</p>
                <p className="text-xs text-slate-500">Retries if call isn't answered</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-600">
                    Retry after (minutes)
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={scheduleForm.retryAfter}
                      onChange={(event) => updateScheduleForm({ retryAfter: Number(event.target.value) || 30 })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  <label className="text-sm text-slate-600">
                    Max retries per call
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={scheduleForm.maxRetries}
                      onChange={(event) => updateScheduleForm({ maxRetries: Number(event.target.value) || 0 })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Call guidance</p>
                <p className="text-xs text-slate-500">
                  Provide context for Eva to steer the call. Describe the purpose, tone, or specific focus areas for this schedule.
                </p>
                <textarea
                  value={scheduleForm.description}
                  onChange={(event) => updateScheduleForm({ description: event.target.value })}
                  placeholder="A gentle morning check-in focusing on medication adherence and overall wellbeing. Keep the conversation warm and supportive, and ask about any concerns or needs."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleSaving}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {scheduleSaving ? 'Saving…' : editingScheduleId ? 'Update schedule' : 'Create schedule'}
                </button>
              </div>
            </form>
            )}
          </>
        )}
      </section>

      {/* Emergency Contacts Section */}
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900">Emergency Contacts</h2>
          </div>
          <p className="text-sm text-slate-600">
            Add emergency contacts who will be notified during emergencies. These contacts will be called if Eva detects an issue.
          </p>
        </div>

        {!elderId && (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <AlertCircle className="h-5 w-5 flex-none text-slate-500" />
            Save {getDisplayName()}'s details first, then you can add emergency contacts.
          </div>
        )}

        {elderId && (
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700">Emergency Contacts</h3>
              {emergencyContacts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                  <User className="h-5 w-5 text-slate-400" />
                  No emergency contacts yet. Add contacts below to ensure quick response in urgent situations.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={emergencyContacts.map((contact) => contact.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {emergencyContacts.map((contact) => (
                        <SortableContactItem key={contact.id} contact={contact} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {!showAddEmergencyContact && !editingEmergencyContact && (
              <button
                type="button"
                onClick={() => {
                  setEditingEmergencyContact(null)
                  setShowAddEmergencyContact(true)
                }}
                className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-4 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition"
              >
                + Add Emergency Contact
              </button>
            )}

            {showAddEmergencyContact && (
              <EmergencyContactForm
                onSave={handleEmergencyContactAdded}
                onCancel={() => setShowAddEmergencyContact(false)}
                isB2C={true}
                elderId={elderId}
                variant="inline"
              />
            )}

            {editingEmergencyContact && (
              <EmergencyContactForm
                contact={{
                  ...editingEmergencyContact,
                  relation: editingEmergencyContact.elder_assignments?.[0]?.relation || ''
                }}
                onSave={handleEmergencyContactEdited}
                onCancel={() => setEditingEmergencyContact(null)}
                isB2C={true}
                elderId={elderId}
                variant="inline"
              />
            )}
          </div>
        )}
      </section>
      </div>
    </div>
  )
}


