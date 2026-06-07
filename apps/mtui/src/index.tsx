#!/usr/bin/env bun
import React from 'react'
import { render } from 'ink'
import { getDefaultTokensFilePath } from '@magister/shared'
import { App } from './tui/App.tsx'

const tokensPath = getDefaultTokensFilePath()

// Enter alternate screen buffer (like vim/less — leaves terminal clean on exit)
process.stdout.write('\x1b[?1049h\x1b[H')

function restoreScreen() {
  process.stdout.write('\x1b[?1049l')
}

process.on('exit', restoreScreen)
process.on('SIGINT', () => { restoreScreen(); process.exit(0) })
process.on('SIGTERM', () => { restoreScreen(); process.exit(0) })

const { waitUntilExit } = render(<App tokensPath={tokensPath} />, {
  exitOnCtrlC: true,
})

await waitUntilExit()
restoreScreen()
