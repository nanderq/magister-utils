import { useState, useEffect, useCallback } from 'react'
import { MagisterClient, GradeItem } from '@magister/shared'

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface GradesState {
  status: FetchStatus
  items: GradeItem[]
  schoolYear: string
  error: string | null
  refresh: () => void
}

export function useGrades(client: MagisterClient | null): GradesState {
  const [status, setStatus] = useState<FetchStatus>('idle')
  const [items, setItems] = useState<GradeItem[]>([])
  const [schoolYear, setSchoolYear] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!client) return
    let cancelled = false

    async function load() {
      setStatus('loading')
      try {
        const personId = await client!.getPersonId()
        const result = await client!.getLatestGradesOverview(personId, {})
        if (!cancelled) {
          setItems(result.items)
          setSchoolYear(result.schoolYearEnd ? result.schoolYearEnd.slice(0, 4) : '')
          setStatus('success')
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setStatus('error')
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [client, tick])

  return { status, items, schoolYear, error, refresh }
}
