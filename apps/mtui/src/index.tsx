#!/usr/bin/env bun
import React from 'react'
import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'
import { getDefaultTokensFilePath } from '@magister/shared'
import { App } from './tui/App.tsx'

const tokensPath = getDefaultTokensFilePath()
const renderer = await createCliRenderer({
  screenMode: 'alternate-screen',
  exitOnCtrlC: true,
  consoleMode: 'disabled',
  targetFps: 30,
})

renderer.setTerminalTitle('Magister')
createRoot(renderer).render(<App tokensPath={tokensPath} />)

await new Promise<void>(resolve => renderer.once('destroy', resolve))
