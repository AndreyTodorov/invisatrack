import Dexie, { type Table } from 'dexie'
import type { Session, AlignerSet, UserProfile, Treatment } from '../types'

interface LocalProfile extends UserProfile { uid: string }
interface LocalTreatment extends Treatment { uid: string }

export class AppDB extends Dexie {
  sessions!: Table<Session & { uid: string }>
  sets!: Table<AlignerSet & { uid: string }>
  profile!: Table<LocalProfile>
  treatment!: Table<LocalTreatment>

  constructor() {
    super('AlignerTrackDB')
    this.version(1).stores({
      sessions: 'id, uid, startTime, endTime, setNumber, updatedAt',
      sets: 'id, uid, setNumber, startDate',
      profile: 'uid',
      treatment: 'uid',
      syncQueue: '++id, timestamp, deviceId',
      syncDeadLetter: '++id, timestamp, deviceId',
    })
    this.version(2).stores({
      syncQueue: null,
      syncDeadLetter: null,
    })
  }
}

export const localDB = new AppDB()
