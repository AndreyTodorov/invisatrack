export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

let scheduledTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleReminderNotification(thresholdMinutes: number): void {
  cancelScheduledNotification()
  if (Notification.permission !== 'granted') return
  scheduledTimer = setTimeout(() => {
    new Notification('InvisaTrack Reminder', {
      body: `Your aligners have been out for ${thresholdMinutes} minutes!`,
      icon: '/invisalign/icon-192.png',
    })
  }, thresholdMinutes * 60 * 1000)
}

export function cancelScheduledNotification(): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer)
    scheduledTimer = null
  }
}
