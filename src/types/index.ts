export interface Session {
  id: string
  startTime: string           // UTC ISO 8601
  endTime: string | null
  startTimezoneOffset: number // minutes offset from UTC
  endTimezoneOffset: number | null
  setNumber: number
  autoCapped: boolean
  createdOffline: boolean
  deviceId: string
  updatedAt: string
}

export interface AlignerSet {
  id: string
  setNumber: number
  startDate: string
  endDate: string | null  // always set for new sets; null only for legacy open sets
  note: string | null
}

export interface UserProfile {
  displayName: string
  email: string
  timezone: string
  dailyWearGoalMinutes: number
  reminderThresholdMinutes: number
  autoCapMinutes: number
  createdAt: string
  theme?: string
}

export interface Treatment {
  totalSets: number | null
  defaultSetDurationDays: number
  currentSetNumber: number
  currentSetStartDate: string
}

export interface DaySegment {
  date: string   // "YYYY-MM-DD" local
  durationMinutes: number
  sessionId: string
}

export interface DailyStats {
  date: string
  totalOffMinutes: number
  wearPercentage: number
  removals: number
  longestRemovalMinutes: number
  compliant: boolean
}

