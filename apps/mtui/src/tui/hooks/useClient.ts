import { useCallback, useEffect, useState } from 'react'
import {
  loginWithCredentials,
  MagisterClient,
  loadStoredTokens,
  writeTokensFile,
  type MagisterCredentials,
} from '@magister/shared'

export interface ClientState {
  client: MagisterClient | null
  userName: string
  loading: boolean
  authenticating: boolean
  error: string | null
  login: (credentials: MagisterCredentials) => Promise<boolean>
}

async function resolveClient(
  client: MagisterClient,
): Promise<{ client: MagisterClient; userName: string }> {
  const auth = await client.getAuthState()
  const fullName = [auth.accountInfo.given_name, auth.accountInfo.family_name]
    .filter(Boolean)
    .join(' ')
  return {
    client,
    userName: auth.name || fullName || (auth.accountInfo.preferred_username as string) || '',
  }
}

export function useClient(tokensPath: string): ClientState {
  const [client, setClient] = useState<MagisterClient | null>(null)
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const tokens = await loadStoredTokens(tokensPath)
        if (!tokens) return
        const resolved = await resolveClient(new MagisterClient({ tokens, tokensFilePath: tokensPath }))
        if (!cancelled) {
          setClient(resolved.client)
          setUserName(resolved.userName)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [tokensPath])

  const login = useCallback(async (credentials: MagisterCredentials): Promise<boolean> => {
    setAuthenticating(true)
    setError(null)
    try {
      const tokens = await loginWithCredentials(credentials)
      await writeTokensFile(tokensPath, tokens)
      const resolved = await resolveClient(new MagisterClient({ tokens, tokensFilePath: tokensPath }))
      setClient(resolved.client)
      setUserName(resolved.userName)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      return false
    } finally {
      setAuthenticating(false)
    }
  }, [tokensPath])

  return { client, userName, loading, authenticating, error, login }
}
