# Eva Cares - Cursor AI Integration Guide

This guide helps Cursor AI understand the Eva Cares frontend codebase for efficient development and modifications.

## 🎯 Project Context

**Eva Cares** is a SaaS platform for AI-powered elder care with voice assistants that:
- Make scheduled check-in calls to elderly individuals
- Detect emergencies and escalate to family members
- Track health and mood through conversation analysis
- Support multi-organization family coordination

## 🏗️ Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **State**: React hooks + Context API

### Design System
- **Apple-inspired UI**: Clean, minimal, rounded corners
- **Color Palette**: Blue primary, semantic colors for status
- **Typography**: Inter font family
- **Spacing**: Tailwind's consistent spacing scale
- **Components**: Card-based layout with subtle borders

## 📁 File Structure Guide

```
src/
├── app/
│   ├── layout.tsx          # Root layout with AuthProvider
│   └── page.tsx            # Main dashboard (auth flow + dashboard)
├── components/
│   ├── auth/               # Authentication components
│   │   ├── AuthProvider.tsx    # Auth context provider
│   │   ├── LoginForm.tsx       # Login form component
│   │   └── SignUpForm.tsx      # Registration form
│   ├── dashboard/          # Dashboard widgets
│   │   ├── DashboardStats.tsx  # Statistics cards
│   │   └── RecentActivity.tsx  # Activity feed
│   ├── elders/             # Elder management
│   │   ├── ElderCard.tsx       # Elder profile card
│   │   └── ElderForm.tsx       # Add/edit elder form
│   ├── emergency/          # Emergency contacts
│   │   └── EmergencyContactForm.tsx
│   ├── escalations/        # Escalation management
│   │   └── EscalationCard.tsx  # Escalation incident card
│   ├── layout/             # Layout components
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── DashboardLayout.tsx # Main layout wrapper
│   ├── notes/              # Notes system
│   │   └── NotesSection.tsx    # Collaborative notes
│   ├── schedules/          # Call scheduling
│   │   ├── ScheduleForm.tsx    # Create/edit schedules
│   │   └── ScheduleAssignment.tsx # Assign schedules to elders
│   └── calls/              # Call history
│       └── CallHistoryCard.tsx # Call record display
├── hooks/
│   └── useOrganizations.ts # Organization state management
├── lib/
│   ├── supabase.ts         # Supabase client config
│   └── utils.ts            # Utility functions
└── types/
    └── database.ts         # TypeScript database types
```

## 🔑 Key Concepts

### 1. Multi-Organization Architecture
- Users can belong to multiple organizations (families)
- Each organization has its own elders, schedules, contacts
- Data isolation between organizations
- Organization switching in UI

### 2. Elder Management
- Central entity representing care recipients
- Stores medical info, contact details, preferences
- Health scoring based on call analysis
- Active/inactive status management

### 3. Call Scheduling System
- **Reusable schedules**: One schedule can be assigned to multiple elders
- **Flexible timing**: Daily, weekly, custom patterns
- **Multiple call times**: Several calls per day
- **Retry logic**: Configurable retry attempts

### 4. Emergency Escalation
- **Automatic detection**: AI identifies concerning phrases/tones
- **Contact hierarchy**: Priority-ordered emergency contacts
- **Follow-up system**: Check-ins after escalations
- **Audit trail**: Complete incident tracking

### 5. Call History & Analysis
- **Detailed records**: Transcripts, tone analysis, costs
- **Mood tracking**: Sentiment and emotional state
- **Performance metrics**: Success rates, durations
- **Escalation indicators**: Visual alerts for concerning calls

## 🎨 Component Patterns

### Standard Component Structure
```typescript
'use client'

import { useState, useEffect } from 'react'
import { Icon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ComponentProps {
  // Always define props interface
  prop: string
  onAction?: () => void
}

export function Component({ prop, onAction }: ComponentProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Component logic here
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Component content */}
    </div>
  )
}
```

### Form Component Pattern
```typescript
const [formData, setFormData] = useState({
  field1: '',
  field2: '',
})
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')
  
  try {
    // Supabase operation
    const { error } = await supabase
      .from('table')
      .insert(formData)
    
    if (error) throw error
    
    onSave()
    onClose()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred')
  } finally {
    setLoading(false)
  }
}
```

### Data Fetching Pattern
```typescript
useEffect(() => {
  if (currentOrg) {
    fetchData()
  }
}, [currentOrg])

const fetchData = async () => {
  try {
    setLoading(true)
    setError('')
    
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    setData(data || [])
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch data')
  } finally {
    setLoading(false)
  }
}
```

## 🗄️ Database Schema Understanding

### Core Tables
- **organizations**: Multi-tenant isolation
- **users**: User accounts linked to Supabase Auth
- **user_organizations**: Many-to-many user-org relationships
- **elders**: Care recipients with medical info
- **call_schedules**: Reusable call configurations
- **elder_call_schedules**: Schedule assignments to elders
- **emergency_contacts**: Priority-ordered contact lists
- **call_executions**: Individual call attempts
- **post_call_reports**: Call analysis and results
- **escalation_incidents**: Emergency escalation tracking

### Key Relationships
- Users ↔ Organizations (many-to-many)
- Organizations → Elders (one-to-many)
- Schedules ↔ Elders (many-to-many via elder_call_schedules)
- Elders → Emergency Contacts (one-to-many)
- Elders → Call Executions (one-to-many)
- Call Executions → Post Call Reports (one-to-one)
- Elders → Escalation Incidents (one-to-many)

## 🎯 Common Development Tasks

### Adding a New Page
1. Create component in appropriate folder
2. Add route in app router if needed
3. Update sidebar navigation
4. Implement data fetching with error handling
5. Follow responsive design patterns

### Creating a New Form
1. Define TypeScript interface for form data
2. Use controlled inputs with state
3. Implement validation
4. Add loading and error states
5. Handle Supabase operations with try-catch
6. Provide user feedback

### Adding a New Feature
1. Update database schema if needed
2. Create/update TypeScript types
3. Build UI components following design system
4. Implement data layer with Supabase
5. Add to navigation if applicable
6. Test error scenarios

### Styling Guidelines
- Use Tailwind utility classes
- Follow spacing scale (p-4, p-6, p-8)
- Use semantic colors (blue for primary, red for errors)
- Maintain rounded-xl for cards
- Ensure hover states for interactive elements

## 🔧 Development Workflow

### Environment Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add Supabase URL and anon key

# Start development server
npm run dev
```

### Code Quality
- TypeScript strict mode enabled
- ESLint configured for Next.js
- Prettier for code formatting
- Use meaningful variable names
- Add comments for complex logic

### Error Handling
- Always wrap async operations in try-catch
- Provide user-friendly error messages
- Log errors to console for debugging
- Handle loading states appropriately
- Graceful degradation for missing features

## 🚀 Deployment Considerations

### Build Process
- Next.js optimizes automatically
- Environment variables must be set
- Database schema must be deployed
- Test authentication flow

### Performance
- Use Next.js Image component for images
- Implement proper loading states
- Consider pagination for large datasets
- Optimize Supabase queries

## 🎯 AI Assistant Guidelines

When working with this codebase:

1. **Follow Patterns**: Use established component and data fetching patterns
2. **Type Safety**: Always define TypeScript interfaces
3. **Error Handling**: Include proper error states and user feedback
4. **Design Consistency**: Follow the Apple-inspired design system
5. **Organization Context**: Remember multi-org architecture in all features
6. **Responsive Design**: Ensure mobile compatibility
7. **Accessibility**: Use semantic HTML and proper ARIA labels
8. **Performance**: Consider loading states and optimization

### Common Modifications
- **Adding fields**: Update TypeScript types, forms, and database queries
- **New components**: Follow the established component structure
- **UI changes**: Use Tailwind classes following the design system
- **Data operations**: Use the established Supabase patterns
- **Navigation**: Update sidebar and routing as needed

### Testing Approach
- Test authentication flow
- Verify organization switching
- Check responsive design
- Test error scenarios
- Validate form submissions
- Ensure data persistence

This guide provides the foundation for understanding and efficiently working with the Eva Cares frontend codebase. The architecture is designed for scalability, maintainability, and excellent user experience.

