import { useState, useEffect, useCallback } from 'react'
import { MagisterClient, AssignmentItem, AssignmentDetail } from '@magister/shared'

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AssignmentsState {
  status: FetchStatus
  items: AssignmentItem[]
  error: string | null
  refresh: () => void
  getDetail: (id: number) => Promise<AssignmentDetail>
}

export function useAssignments(client: MagisterClient | null): AssignmentsState {
  const [status, setStatus] = useState<FetchStatus>('idle')
  const [items, setItems] = useState<AssignmentItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const detailCache = new Map<number, AssignmentDetail>()

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!client) return
    let cancelled = false

    async function load() {
      setStatus('loading')
      try {
        const personId = await client!.getPersonId()
        const data = await client!.getAssignments(personId, { top: 50, skip: 0 })
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
  }, [client, tick])

  const getDetail = useCallback(async (id: number): Promise<AssignmentDetail> => {
    if (detailCache.has(id)) return detailCache.get(id)!
    if (!client) throw new Error('No client')
    const personId = await client.getPersonId()
    const detail = await client.getAssignment(personId, id)
    detailCache.set(id, detail)
    return detail
  }, [client])

  return { status, items, error, refresh, getDetail }
}
