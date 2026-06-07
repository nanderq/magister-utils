import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { MagisterClient, MessageItem, MessageDetail } from '@magister/shared'
import { LoadingSpinner } from '../components/LoadingSpinner.tsx'
import { ErrorBanner } from '../components/ErrorBanner.tsx'
import { useMessages } from '../hooks/useMessages.ts'
import { formatDate, formatTime, parseDate } from '../utils/dates.ts'
import { truncate, stripHtml } from '../utils/text.ts'

// 'list' = arrow keys move the list, right pane shows preview
// 'detail' = arrow keys scroll the message body
type Focus = 'list' | 'detail'

interface MessagesViewProps {
  client: MagisterClient | null
  refreshTick: number
  width: number
  height: number
}

export function MessagesView({ client, refreshTick, width, height }: MessagesViewProps) {
  const messages = useMessages(client)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [listScroll, setListScroll] = useState(0)
  const [focus, setFocus] = useState<Focus>('list')
  const [detail, setDetail] = useState<MessageDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [bodyScroll, setBodyScroll] = useState(0)

  useEffect(() => {
    if (refreshTick > 0) messages.refresh()
  }, [refreshTick])

  // Auto-load detail whenever selected message changes
  useEffect(() => {
    const item = messages.items[selectedIndex]
    if (!item?.id) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    setDetailError(null)
    setBodyScroll(0)
    messages.getMessageDetail(item.id).then(d => {
      setDetail(d)
      setDetailLoading(false)
    }).catch(e => {
      setDetailError(e instanceof Error ? e.message : String(e))
      setDetailLoading(false)
    })
  }, [selectedIndex, messages.items])

  // Keep list scroll window around selected item
  // Subtract 2 for top/bottom border, 1 for the "Load more" row when visible
  const itemsPerPage = Math.max(1, Math.floor((height - 2 - (messages.hasMore ? 1 : 0)) / 2))
  useEffect(() => {
    if (selectedIndex < listScroll) setListScroll(selectedIndex)
    if (selectedIndex >= listScroll + itemsPerPage) setListScroll(selectedIndex - itemsPerPage + 1)
  }, [selectedIndex, itemsPerPage])

  useInput((input, key) => {
    if (focus === 'list') {
      const totalRows = messages.items.length + (messages.hasMore ? 1 : 0)
      if (key.upArrow) setSelectedIndex(i => Math.max(0, i - 1))
      if (key.downArrow) setSelectedIndex(i => Math.min(totalRows - 1, i + 1))
      if (key.return) {
        if (selectedIndex === messages.items.length) {
          messages.loadMore()
        } else {
          // Switch focus to right pane for scrolling
          setFocus('detail')
        }
      }
      if (input === 'r') messages.refresh()
    } else {
      if (key.escape || key.leftArrow) setFocus('list')
      if (key.upArrow) setBodyScroll(s => Math.max(0, s - 1))
      if (key.downArrow) setBodyScroll(s => s + 1)
    }
  })

  const listWidth = Math.floor(width * 0.36)
  const detailWidth = width - listWidth - 1

  const visibleItems = messages.items.slice(listScroll, listScroll + itemsPerPage)

  const bodyLines: string[] = detail?.inhoud ? stripHtml(detail.inhoud).split('\n') : []
  // overhead in detail pane: subject(1) + from(1) + date(1) + divider(1) = 4
  const bodyVisible = Math.max(1, height - 4)
  const visibleBodyLines = bodyLines.slice(bodyScroll, bodyScroll + bodyVisible)

  function msgDate(item: MessageItem): string {
    if (!item.verzondenOp) return ''
    const d = parseDate(item.verzondenOp)
    if (!d) return ''
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return formatTime(d)
    return `${String(d.getDate()).padStart(2)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`
  }

  const selectedItem = messages.items[selectedIndex]

  return (
    <Box flexDirection="row" width={width} height={height} overflow="hidden">
      {/* Left pane: list */}
      <Box
        flexDirection="column"
        width={listWidth}
        height={height}
        overflow="hidden"
        borderStyle="single"
        borderColor={focus === 'list' ? 'cyan' : 'gray'}
      >
        {messages.status === 'loading' && messages.items.length === 0 && (
          <Box padding={1}><LoadingSpinner label="Loading…" /></Box>
        )}
        {messages.status === 'error' && messages.error && (
          <Box padding={1}><ErrorBanner message={messages.error} /></Box>
        )}

        {visibleItems.map((item, vi) => {
          const i = listScroll + vi
          const selected = i === selectedIndex
          const bg = selected ? 'blue' : undefined
          const senderName = truncate(item.afzender?.naam ?? 'Unknown', listWidth - 8)

          return (
            <Box key={item.id ?? i} flexDirection="column" backgroundColor={bg}>
              <Box flexDirection="row" justifyContent="space-between">
                <Text bold={item.heeftPrioriteit} color={item.heeftPrioriteit ? 'red' : 'white'} backgroundColor={bg}>
                  {item.heeftPrioriteit ? '! ' : '  '}{senderName}
                </Text>
                <Text color="gray" dimColor backgroundColor={bg}>{msgDate(item)} </Text>
              </Box>
              <Text color={selected ? 'cyan' : 'gray'} dimColor={!selected} backgroundColor={bg}>
                {'  '}{truncate(item.onderwerp ?? '(no subject)', listWidth - 4)}
              </Text>
            </Box>
          )
        })}

        {messages.hasMore && (() => {
          const loadMoreIdx = messages.items.length
          const active = selectedIndex === loadMoreIdx && focus === 'list'
          return (
            <Text
              color={active ? 'white' : 'gray'}
              backgroundColor={active ? 'blue' : undefined}
              dimColor={!active}
            >
              {messages.status === 'loading' ? '  ⟳ Loading…' : '  ↓ Load more'}
            </Text>
          )
        })()}
      </Box>

      {/* Divider */}
      <Box flexDirection="column" width={1} height={height}>
        {Array.from({ length: height }, (_, i) => (
          <Text key={i} color="gray">│</Text>
        ))}
      </Box>

      {/* Right pane: message detail */}
      <Box
        flexDirection="column"
        width={detailWidth}
        height={height}
        overflow="hidden"
        borderStyle="single"
        borderColor={focus === 'detail' ? 'cyan' : 'gray'}
      >
        {!selectedItem && (
          <Box paddingX={1}>
            <Text dimColor>Select a message with ↑/↓</Text>
          </Box>
        )}

        {selectedItem && detailLoading && (
          <Box paddingX={1}><LoadingSpinner label="Loading…" /></Box>
        )}

        {selectedItem && detailError && (
          <Box paddingX={1}><ErrorBanner message={detailError} /></Box>
        )}

        {selectedItem && detail && !detailLoading && (
          <Box flexDirection="column" paddingX={1}>
            <Text bold wrap="truncate-end">{detail.onderwerp ?? '(no subject)'}</Text>
            <Text color="gray">From: {truncate(detail.afzender?.naam ?? 'Unknown', detailWidth - 8)}</Text>
            {detail.verzondenOp && (
              <Text dimColor>{formatDate(detail.verzondenOp)} {formatTime(detail.verzondenOp)}</Text>
            )}
            <Text color="gray">{'─'.repeat(Math.max(0, detailWidth - 3))}</Text>

            {bodyScroll > 0 && <Text dimColor> ↑ {bodyScroll} lines above</Text>}

            {visibleBodyLines.map((line, i) => (
              <Text key={i} wrap="wrap">{line || ' '}</Text>
            ))}

            {bodyScroll + bodyVisible < bodyLines.length && (
              <Text dimColor> ↓ {bodyLines.length - bodyScroll - bodyVisible} lines below</Text>
            )}

            {detail.heeftBijlagen && (
              <Text color="yellow">⚑ Has attachments</Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
