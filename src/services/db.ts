import Dexie, { Table } from 'dexie'
import { Session, AlignerSet, UserProfile, Treatment, SyncQueueItem } from '../types'

interface LocalProfile extends UserProfile { uid: string }
interface LocalTreatment extends Treatment { uid: string }

export interface DeadLetterItem extends SyncQueueItem {
  failedAt: string
  reason: string
}

export class AppDB extends Dexie {
  sessions!: Table<Session & { uid: string }>
  sets!: Table<AlignerSet & { uid: string }>
  profile!: Table<LocalProfile>
  treatment!: Table<LocalTreatment>
  syncQueue!: Table<SyncQueueItem>
  syncDeadLetter!: Table<DeadLetterItem>

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
  }
}

export const localDB = new AppDB()
