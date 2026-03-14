export type DemoCallHasAudioFilter = 'yes' | 'no' | 'all'
export type DemoCallEmailSentFilter = 'sent' | 'unsent' | 'all'
export type DemoCallRangeFilter = '7d' | '30d' | 'all'

export type DemoCallReviewItem = {
  id: string
  sessionId: string
  createdAt: string | null
  startedAt: string | null
  audioUrl: string | null
  hasAudio: boolean
  leadEmail: string | null
  leadName: string | null
  emailSent: boolean
  totalTokens: number | null
  totalCostUsd: number | null
  transcriptPreview: string
}

export type DemoCallsResponse = {
  items: DemoCallReviewItem[]
  total: number
  limit: number
  offset: number
}
