import React, { useCallback, useState } from 'react'
import { decodePasteBytes } from '@opentui/core'
import { useKeyboard, usePaste, useTerminalDimensions } from '@opentui/react'
import type { MagisterCredentials } from '@magister/shared'
import { Box, Text } from '../components/primitives.tsx'

type Field = 'tenant' | 'username' | 'password'

interface LoginViewProps {
  error: string | null
  submitting: boolean
  onSubmit: (credentials: MagisterCredentials) => Promise<boolean>
}

export function LoginView({ error, submitting, onSubmit }: LoginViewProps) {
  const { width: cols, height: rows } = useTerminalDimensions()
  const [tenant, setTenant] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [focused, setFocused] = useState<Field>('tenant')

  const submit = useCallback(async () => {
    if (submitting || !tenant.trim() || !username.trim() || !password) return
    const succeeded = await onSubmit({ tenant, username, password })
    if (!succeeded) setPassword('')
  }, [onSubmit, password, submitting, tenant, username])

  useKeyboard(key => {
    if (key.name === 'tab') {
      const fields: Field[] = ['tenant', 'username', 'password']
      const direction = key.shift ? -1 : 1
      const next = (fields.indexOf(focused) + direction + fields.length) % fields.length
      setFocused(fields[next])
      return
    }
    if (focused !== 'password' || submitting) return
    if (key.name === 'backspace') {
      setPassword(value => value.slice(0, -1))
      return
    }
    if (key.name === 'return') {
      void submit()
      return
    }
    if (!key.ctrl && !key.meta && key.sequence >= ' ' && key.sequence.length > 0) {
      setPassword(value => value + key.sequence)
    }
  })

  usePaste(event => {
    if (focused === 'password' && !submitting) {
      setPassword(value => value + decodePasteBytes(event.bytes).replace(/[\r\n]/g, ''))
    }
  })

  const panelWidth = Math.max(36, Math.min(64, cols - 4))
  const inputColors = (field: Field) => ({
    borderColor: focused === field ? '#c8ff4a' : '#555c52',
  })

  return (
    <Box width={cols} height={rows} alignItems="center" justifyContent="center">
      <Box flexDirection="column" width={panelWidth} borderStyle="rounded" borderColor="#697066" padding={2} gap={1}>
        <Text color="#c8ff4a" bold>MAGISTER</Text>
        <Text color="#aeb4aa">Sign in with your school account. Credentials are sent directly to Magister and never stored.</Text>

        <Text color="#a4aa9f">SCHOOL URL</Text>
        <Box height={3} borderStyle="rounded" {...inputColors('tenant')}>
          <input
            value={tenant}
            placeholder="https://school.magister.net"
            onInput={setTenant}
            onSubmit={() => setFocused('username')}
            focused={focused === 'tenant'}
            width="100%"
          />
        </Box>

        <Text color="#a4aa9f">USERNAME</Text>
        <Box height={3} borderStyle="rounded" {...inputColors('username')}>
          <input
            value={username}
            placeholder="name@example.com"
            onInput={setUsername}
            onSubmit={() => setFocused('password')}
            focused={focused === 'username'}
            width="100%"
          />
        </Box>

        <Text color="#a4aa9f">PASSWORD</Text>
        <Box height={3} borderStyle="rounded" {...inputColors('password')} paddingLeft={1} alignItems="center">
          <Text color={password ? '#f2f4ed' : '#697066'}>
            {password ? '•'.repeat(password.length) : 'Enter password'}
          </Text>
        </Box>

        <Text color={error ? '#f0968c' : '#aeb4aa'}>
          {error ?? (submitting ? 'Connecting…' : 'Tab to move  •  Enter to continue/sign in  •  Ctrl+C to quit')}
        </Text>
      </Box>
    </Box>
  )
}
