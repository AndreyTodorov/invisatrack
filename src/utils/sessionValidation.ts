interface SessionLike {
  id?: string
  startTime: string
  endTime: string | null
}

export function validateSession(
  startTime: string,
  endTime: string,
  otherSessions: SessionLike[],
  excludeId?: string
): void {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()

  if (end <= start) throw new Error('End time must be after start time.')

  const durationMs = end - start
  if (durationMs > 24 * 60 * 60 * 1000) throw new Error('Session cannot be longer than 24 hours.')

  const others = otherSessions.filter(s => s.id !== excludeId && s.endTime !== null)
  const overlap = others.find(s => {
    const sStart = new Date(s.startTime).getTime()
    const sEnd = new Date(s.endTime!).getTime()
    return start < sEnd && end > sStart
  })
  if (overlap) throw new Error('This session overlaps with an existing session. Please adjust the times.')
}
