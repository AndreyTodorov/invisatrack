import { initializeApp } from 'firebase/app'
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword,
  connectAuthEmulator,
} from 'firebase/auth'
import {
  getDatabase, ref, set, update, remove, get, onValue, push, connectDatabaseEmulator,
} from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getDatabase(app)
export const googleProvider = new GoogleAuthProvider()

if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
  connectDatabaseEmulator(db, 'localhost', 9000)
}

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
export const signOutUser = () => signOut(auth)
export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const userRef = (uid: string) => ref(db, `users/${uid}`)
export const profileRef = (uid: string) => ref(db, `users/${uid}/profile`)
export const treatmentRef = (uid: string) => ref(db, `users/${uid}/treatment`)
export const sessionsRef = (uid: string) => ref(db, `users/${uid}/sessions`)
export const sessionRef = (uid: string, id: string) => ref(db, `users/${uid}/sessions/${id}`)
export const setsRef = (uid: string) => ref(db, `users/${uid}/sets`)
export const setRef = (uid: string, id: string) => ref(db, `users/${uid}/sets/${id}`)
export const seedVersionRef = (uid: string) => ref(db, `users/${uid}/seedVersion`)

export { set, update, remove, get, onValue, push, ref }
