import { useState, useEffect, useCallback } from 'react'
import { MagisterClient, ScheduleItem } from '@magister/shared'
import { getWeekRange, toApiDate } from '../utils/dates.ts'

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ScheduleState {
  status: FetchStatus
  items: ScheduleItem[]
  error: string | null
  weekOffset: number
  setWeekOffset: (offset: number) => void
  refresh: () => void
}

export function useSchedule(client: MagisterClient | null): ScheduleState {
  const [weekOffset, setWeekOffset] = useState(0)
  const [status, setStatus] = useState<FetchStatus>('idle')
  const [items, setItems] = useState<ScheduleItem[]>([])
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
        const { from, to } = getWeekRange(weekOffset)
        const data = await client!.getSchedule(personId, toApiDate(from), toApiDate(to))
        if (!cancelled) {
          setItems(data)
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
  }, [client, weekOffset, tick])

  return { status, items, error, weekOffset, setWeekOffset, refresh }
}
