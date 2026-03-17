import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataContext } from '../contexts/DataContext'

export default function HomeView() {
  const { treatment, loaded } = useDataContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (loaded && !treatment) navigate('/onboarding', { replace: true })
  }, [loaded, treatment, navigate])

  return <div className="p-4"><h2 className="text-xl font-bold">Home (stub)</h2></div>
}
