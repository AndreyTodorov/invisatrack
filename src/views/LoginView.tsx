import { useAuthContext } from '../contexts/AuthContext'

export default function LoginView() {
  const { signIn } = useAuthContext()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-indigo-600">AlignerTrack</h1>
        <p className="text-gray-500 mt-2">Track your Invisalign wear time</p>
      </div>
      <button
        onClick={signIn}
        className="flex items-center gap-3 bg-white border border-gray-300 rounded-xl px-6 py-3 shadow-sm hover:shadow-md transition-shadow text-sm font-medium"
      >
        Sign in with Google
      </button>
    </div>
  )
}
