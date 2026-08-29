import React, { useEffect, useState } from 'react'
import { Text } from './primitives.tsx'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

interface LoadingSpinnerProps {
  label?: string
}

export function LoadingSpinner({ label = 'Loading…' }: LoadingSpinnerProps) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % FRAMES.length), 80)
    return () => clearInterval(id)
  }, [])

  return (
    <Text color="cyan">{FRAMES[frame]} {label}</Text>
  )
}
