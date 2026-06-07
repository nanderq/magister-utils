import { useState, useEffect } from 'react'
import { useStdout } from 'ink'

export interface TerminalSize {
  cols: number
  rows: number
}

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout()
  const [size, setSize] = useState<TerminalSize>({
    cols: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  })

  useEffect(() => {
    if (!stdout) return
    const handler = () => setSize({ cols: stdout.columns, rows: stdout.rows })
    stdout.on('resize', handler)
    return () => { stdout.off('resize', handler) }
  }, [stdout])

  return size
}
