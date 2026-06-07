import React from 'react'
import { Box, Text } from 'ink'

interface ErrorBannerProps {
  message: string
  hint?: string
}

export function ErrorBanner({ message, hint }: ErrorBannerProps) {
  return (
    <Box borderStyle="round" borderColor="red" paddingX={1} flexDirection="column">
      <Text color="red" bold>Error: {message}</Text>
      {hint && <Text dimColor>{hint}</Text>}
    </Box>
  )
}
