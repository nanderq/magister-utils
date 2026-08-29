import React from 'react'
import { Box, Text } from './primitives.tsx'

export type View = 'schedule' | 'grades' | 'messages' | 'assignments'

const TABS: { id: View; label: string; key: string }[] = [
  { id: 'schedule', label: 'Schedule', key: '1' },
  { id: 'grades', label: 'Grades', key: '2' },
  { id: 'messages', label: 'Messages', key: '3' },
  { id: 'assignments', label: 'Assignments', key: '4' },
]

interface NavBarProps {
  active: View
  width: number
  subtitle?: string
}

export function NavBar({ active, width, subtitle }: NavBarProps) {
  return (
    <Box width={width} backgroundColor="gray" flexDirection="row">
      <Text> </Text>
      {TABS.map((tab, i) => (
        <React.Fragment key={tab.id}>
          {i > 0 && <Text backgroundColor="gray" color="black"> │ </Text>}
          {active === tab.id ? (
            <Text backgroundColor="white" color="black" bold>
              {' '}[{tab.key}] {tab.label.toUpperCase()}{' '}
            </Text>
          ) : (
            <Text backgroundColor="gray" color="black">
              [{tab.key}] {tab.label}
            </Text>
          )}
        </React.Fragment>
      ))}
      {subtitle && (
        <Text backgroundColor="gray" color="black">{'   '}{subtitle}</Text>
      )}
    </Box>
  )
}
