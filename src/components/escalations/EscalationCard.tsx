'use client'

import { useState } from 'react'
import { AlertTriangle, Clock, User, Phone, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface EscalationIncident {
  id: string
  elder_name: string
  escalation_reason: string
  severity_level: string
  elder_consent?: boolean
  status: string
  created_at: string
  resolved_at?: string
  resolution_notes?: string
  contact_attempts?: {
    contact_name: string
    status: string
    answered_at?: string
    contact_response?: string
  }[]
  followup_status?: string
  followup_response?: string
}

interface EscalationCardProps {
  escalation: EscalationIncident
  onViewDetails: (escalation: EscalationIncident) => void
  onResolve?: (escalation: EscalationIncident) => void
}

export function EscalationCard({ escalation, onViewDetails, onResolve }: EscalationCardProps) {
  const [expanded, setExpanded] = useState(false)

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'in_progress':
      case 'contacting':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />
    }
  }

  const isResolved = escalation.status.toLowerCase() === 'resolved'
  const canResolve = !isResolved && onResolve

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="ml-3">
            <h3 className="font-semibold text-gray-900">{escalation.elder_name}</h3>
            <p className="text-sm text-gray-600">{formatDateTime(escalation.created_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon(escalation.status)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(escalation.status)}`}>
            {escalation.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Severity and Reason */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(escalation.severity_level)}`}>
            {escalation.severity_level} Priority
          </span>
          
          {escalation.elder_consent !== undefined && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              escalation.elder_consent 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {escalation.elder_consent ? 'Consent Given' : 'Consent Declined'}
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-700 font-medium mb-1">Reason:</p>
        <p className="text-sm text-gray-600">{escalation.escalation_reason}</p>
      </div>

      {/* Contact Attempts Summary */}
      {escalation.contact_attempts && escalation.contact_attempts.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Attempts</h4>
          <div className="space-y-2">
            {escalation.contact_attempts.slice(0, expanded ? undefined : 2).map((attempt, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-700">{attempt.contact_name}</span>
                </div>
                <div className="flex items-center">
                  {attempt.status === 'answered' ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-xs ${
                    attempt.status === 'answered' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {attempt.status}
                  </span>
                </div>
              </div>
            ))}
            
            {escalation.contact_attempts.length > 2 && !expanded && (
              <p className="text-xs text-gray-500">
                +{escalation.contact_attempts.length - 2} more attempts
              </p>
            )}
          </div>
        </div>
      )}

      {/* Follow-up Status */}
      {escalation.followup_status && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center mb-1">
            <Phone className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">Follow-up Status</span>
          </div>
          <p className="text-sm text-blue-700">{escalation.followup_status}</p>
          {escalation.followup_response && (
            <p className="text-sm text-blue-600 mt-1">"{escalation.followup_response}"</p>
          )}
        </div>
      )}

      {/* Resolution */}
      {isResolved && escalation.resolution_notes && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center mb-1">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">Resolved</span>
            {escalation.resolved_at && (
              <span className="text-xs text-green-600 ml-2">
                {formatDateTime(escalation.resolved_at)}
              </span>
            )}
          </div>
          <p className="text-sm text-green-700">{escalation.resolution_notes}</p>
        </div>
      )}

      {/* Expandable Details */}
      {escalation.contact_attempts && escalation.contact_attempts.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">
              {expanded ? 'Hide Details' : 'Show All Contact Attempts'}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expanded && (
            <div className="mt-4 space-y-3">
              {escalation.contact_attempts.map((attempt, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{attempt.contact_name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      attempt.status === 'answered' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {attempt.status}
                    </span>
                  </div>
                  
                  {attempt.answered_at && (
                    <p className="text-xs text-gray-600 mb-1">
                      Answered: {formatDateTime(attempt.answered_at)}
                    </p>
                  )}
                  
                  {attempt.contact_response && (
                    <p className="text-sm text-gray-700">
                      Response: "{attempt.contact_response}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => onViewDetails(escalation)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View Full Details →
        </button>
        
        {canResolve && (
          <button
            onClick={() => onResolve(escalation)}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            Mark Resolved
          </button>
        )}
      </div>
    </div>
  )
}

