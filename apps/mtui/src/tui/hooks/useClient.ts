import { useState, useEffect } from 'react'
import { MagisterClient } from '@magister/shared'

export interface ClientState {
  client: MagisterClient | null
  userName: string
  loading: boolean
  error: string | null
}

export function useClient(tokensPath: string): ClientState {
  const [state, setState] = useState<ClientState>({
    client: null,
    userName: '',
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const client = await MagisterClient.fromTokensFile(tokensPath)
        const auth = await client.getAuthState()
        const fullName = [auth.accountInfo.given_name, auth.accountInfo.family_name]
          .filter(Boolean)
          .join(' ')
        const name = auth.name || fullName || (auth.accountInfo.preferred_username as string) || ''

        if (!cancelled) {
          setState({ client, userName: name, loading: false, error: null })
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e)
          setState({ client: null, userName: '', loading: false, error: msg })
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [tokensPath])

  return state
}
