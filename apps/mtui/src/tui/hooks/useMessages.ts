import { useState, useEffect, useCallback } from 'react'
import { MagisterClient, MessageItem, MessageDetail } from '@magister/shared'

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface MessagesState {
  status: FetchStatus
  items: MessageItem[]
  error: string | null
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
  getMessageDetail: (id: number) => Promise<MessageDetail>
}

const PAGE_SIZE = 15

export function useMessages(client: MagisterClient | null): MessagesState {
  const [status, setStatus] = useState<FetchStatus>('idle')
  const [items, setItems] = useState<MessageItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [tick, setTick] = useState(0)
  const detailCache = new Map<number, MessageDetail>()

  const refresh = useCallback(() => {
    setItems([])
    setHasMore(true)
    setTick(t => t + 1)
  }, [])

  useEffect(() => {
    if (!client) return
    let cancelled = false

    async function load() {
      setStatus('loading')
      try {
        const data = await client!.getMessages({ top: PAGE_SIZE, skip: 0 })
        if (!cancelled) {
          setItems(data)
          setHasMore(data.length === PAGE_SIZE)
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

  const loadMore = useCallback(async () => {
    if (!client || status === 'loading') return
    setStatus('loading')
    try {
      const data = await client.getMessages({ top: PAGE_SIZE, skip: items.length })
      setItems(prev => [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
      setStatus('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [client, items.length, status])

  const getMessageDetail = useCallback(async (id: number): Promise<MessageDetail> => {
    if (detailCache.has(id)) return detailCache.get(id)!
    if (!client) throw new Error('No client')
    const detail = await client.getMessage(id)
    detailCache.set(id, detail)
    return detail
  }, [client])

  return { status, items, error, hasMore, loadMore, refresh, getMessageDetail }
}
