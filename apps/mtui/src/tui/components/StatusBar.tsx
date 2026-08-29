import React from 'react'
import { Box, Text } from './primitives.tsx'

interface StatusBarProps {
  width: number
  userName?: string
  hints: string
}

export function StatusBar({ width, userName, hints }: StatusBarProps) {
  const right = userName ? ` ${userName} ` : ''
  // Pad hints so userName is right-aligned
  const leftLen = width - right.length
  const left = hints.length > leftLen ? hints.slice(0, leftLen) : hints.padEnd(leftLen)

  return (
    <Box width={width} backgroundColor="gray" flexDirection="row">
      <Text backgroundColor="gray" color="black">{left}</Text>
      {right && <Text backgroundColor="gray" color="black" bold>{right}</Text>}
    </Box>
  )
}
