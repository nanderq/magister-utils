import React, { useState, useCallback } from 'react'
import { useRenderer, useTerminalDimensions } from '@opentui/react'
import type { MagisterClient } from '@magister/shared'
import { Box, useInput } from './components/primitives.tsx'
import { NavBar, View } from './components/NavBar.tsx'
import { StatusBar } from './components/StatusBar.tsx'
import { LoadingSpinner } from './components/LoadingSpinner.tsx'
import { useClient } from './hooks/useClient.ts'
import { LoginView } from './views/LoginView.tsx'
import { ScheduleView } from './views/ScheduleView.tsx'
import { GradesView } from './views/GradesView.tsx'
import { MessagesView } from './views/MessagesView.tsx'
import { AssignmentsView } from './views/AssignmentsView.tsx'

interface AppProps {
  tokensPath: string
}

// NavBar (1 line) + StatusBar (1 line) = 2 lines of chrome overhead
const CHROME_LINES = 2

export function App({ tokensPath }: AppProps) {
  const { width: cols, height: rows } = useTerminalDimensions()
  const { client, userName, loading, authenticating, error, login } = useClient(tokensPath)

  if (loading) {
    return (
      <Box flexDirection="column" width={cols} height={rows} overflow="hidden">
        <Box flexGrow={1} alignItems="center" justifyContent="center">
          <LoadingSpinner label="Connecting to Magister…" />
        </Box>
      </Box>
    )
  }

  if (!client) {
    return <LoginView error={error} submitting={authenticating} onSubmit={login} />
  }

  return <AuthenticatedApp client={client} userName={userName} />
}

interface AuthenticatedAppProps {
  client: MagisterClient
  userName: string
}

function AuthenticatedApp({ client, userName }: AuthenticatedAppProps) {
  const renderer = useRenderer()
  const { width: cols, height: rows } = useTerminalDimensions()
  const [view, setView] = useState<View>('schedule')
  const [refreshTick, setRefreshTick] = useState(0)

  const contentHeight = Math.max(1, rows - CHROME_LINES)

  const refresh = useCallback(() => setRefreshTick(t => t + 1), [])

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      renderer.destroy()
      return
    }
    if (input === '1') setView('schedule')
    if (input === '2') setView('grades')
    if (input === '3') setView('messages')
    if (input === '4') setView('assignments')
    if (key.tab) {
      const order: View[] = ['schedule', 'grades', 'messages', 'assignments']
      const idx = order.indexOf(view)
      if (key.shift) {
        setView(order[(idx - 1 + order.length) % order.length])
      } else {
        setView(order[(idx + 1) % order.length])
      }
    }
    if (input === 'r') refresh()
  })

  const viewHints: Record<View, string> = {
    schedule: ' [←/→] Weeks  [w] Weekend  [r] Refresh  [tab] Switch  [q] Quit',
    grades:   ' [↑/↓] Scroll  [f] All/Failing  [r] Refresh  [tab] Switch  [q] Quit',
    messages: ' [↑/↓] List  [enter] Open  [esc] Back  [r] Refresh  [tab] Switch  [q] Quit',
    assignments: ' [↑/↓] Navigate  [enter] Detail  [f] Filter  [r] Refresh  [tab] Switch  [q] Quit',
  }

  return (
    <Box flexDirection="column" width={cols} height={rows} overflow="hidden">
      <NavBar active={view} width={cols} />
      <Box height={contentHeight} overflow="hidden">
        {view === 'schedule' && (
          <ScheduleView client={client} refreshTick={refreshTick} width={cols} height={contentHeight} />
        )}
        {view === 'grades' && (
          <GradesView client={client} refreshTick={refreshTick} width={cols} height={contentHeight} />
        )}
        {view === 'messages' && (
          <MessagesView client={client} refreshTick={refreshTick} width={cols} height={contentHeight} />
        )}
        {view === 'assignments' && (
          <AssignmentsView client={client} refreshTick={refreshTick} width={cols} height={contentHeight} />
        )}
      </Box>
      <StatusBar width={cols} userName={userName} hints={viewHints[view]} />
    </Box>
  )
}
