import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useSets } from '../hooks/useSets'
import { update, ref, db } from '../services/firebase'
import { localDB } from '../services/db'
import { nowISO } from '../utils/time'
import {
  DEFAULT_DAILY_WEAR_GOAL_MINUTES,
  DEFAULT_REMINDER_THRESHOLD_MINUTES,
  DEFAULT_AUTO_CAP_MINUTES,
  DEFAULT_SET_DURATION_DAYS,
} from '../constants'

export default function OnboardingView() {
  const { user } = useAuthContext()
  const { startNewSet } = useSets()
  const navigate = useNavigate()
  const [currentSet, setCurrentSet] = useState('1')
  const [totalSets, setTotalSets] = useState('')
  const [goalHours, setGoalHours] = useState(22)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!user) return
    const setNum = parseInt(currentSet)
    if (isNaN(setNum) || setNum < 1) {
      setError('Please enter a valid set number (1 or higher).')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const profile = {
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        timezone: 'auto',
        dailyWearGoalMinutes: Math.round(goalHours * 60),
        reminderThresholdMinutes: DEFAULT_REMINDER_THRESHOLD_MINUTES,
        autoCapMinutes: DEFAULT_AUTO_CAP_MINUTES,
        createdAt: nowISO(),
      }
      await update(ref(db, `users/${user.uid}/profile`), profile)
      await localDB.profile.put({ ...profile, uid: user.uid })

      const treatment = {
        totalSets: totalSets ? parseInt(totalSets) : null,
        defaultSetDurationDays: DEFAULT_SET_DURATION_DAYS,
        currentSetNumber: setNum,
        currentSetStartDate: nowISO(),
      }
      await update(ref(db, `users/${user.uid}/treatment`), treatment)
      await localDB.treatment.put({ ...treatment, uid: user.uid })

      await startNewSet(setNum)
      navigate('/', { replace: true })
    } catch (e: unknown) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 p-6 max-w-md mx-auto space-y-6">
      <div className="text-center pt-8">
        <h1 className="text-2xl font-bold text-indigo-600">Welcome to AlignerTrack</h1>
        <p className="text-gray-500 mt-2">Let's set up your treatment plan</p>
      </div>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current aligner set #
          </label>
          <input
            type="number" min="1" value={currentSet}
            onChange={e => setCurrentSet(e.target.value)}
            className="w-full border rounded-xl p-3 text-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total sets in treatment (optional)
          </label>
          <input
            type="number" min="1" value={totalSets}
            onChange={e => setTotalSets(e.target.value)}
            placeholder="e.g. 30"
            className="w-full border rounded-xl p-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Daily wear goal (hours)
          </label>
          <input
            type="number" min="1" max="24" step="0.5" value={goalHours}
            onChange={e => setGoalHours(parseFloat(e.target.value))}
            className="w-full border rounded-xl p-3"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-500 text-white rounded-xl py-4 font-bold text-lg disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Start Tracking'}
      </button>
    </div>
  )
}
