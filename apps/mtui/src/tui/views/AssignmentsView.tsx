import React, { useState, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import { MagisterClient, AssignmentItem, AssignmentDetail } from '@magister/shared'
import { LoadingSpinner } from '../components/LoadingSpinner.tsx'
import { ErrorBanner } from '../components/ErrorBanner.tsx'
import { useAssignments } from '../hooks/useAssignments.ts'
import { formatDate, formatTime, parseDate } from '../utils/dates.ts'
import { truncate, pad, stripHtml } from '../utils/text.ts'
import { assignmentStatusColor } from '../utils/colors.ts'

type AssignmentFilter = 'all' | 'open' | 'closed'
type AssignmentStatus = 'OPEN' | 'VERLOPEN' | 'INGEDIEND' | 'GESLOTEN'

function getStatus(item: AssignmentItem): AssignmentStatus {
  if (item.Afgesloten) return item.IngeleverdOp ? 'INGEDIEND' : 'GESLOTEN'
  if (item.InleverenVoor && new Date(item.InleverenVoor) < new Date()) return 'VERLOPEN'
  return 'OPEN'
}

interface AssignmentsViewProps {
  client: MagisterClient | null
  refreshTick: number
  width: number
  height: number
}

export function AssignmentsView({ client, refreshTick, width, height }: AssignmentsViewProps) {
  const assignments = useAssignments(client)
  const [filter, setFilter] = useState<AssignmentFilter>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [listScroll, setListScroll] = useState(0)
  const [showDetail, setShowDetail] = useState(false)
  const [detail, setDetail] = useState<AssignmentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailScroll, setDetailScroll] = useState(0)

  React.useEffect(() => {
    if (refreshTick > 0) assignments.refresh()
  }, [refreshTick])

  const filteredItems = useMemo(() => {
    let items = [...assignments.items]
    if (filter === 'open') items = items.filter(i => !i.Afgesloten)
    if (filter === 'closed') items = items.filter(i => i.Afgesloten)
    items.sort((a, b) => {
      const sa = getStatus(a)
      const sb = getStatus(b)
      const openA = sa === 'OPEN' || sa === 'VERLOPEN'
      const openB = sb === 'OPEN' || sb === 'VERLOPEN'
      if (openA !== openB) return openA ? -1 : 1
      const da = a.InleverenVoor ?? ''
      const db = b.InleverenVoor ?? ''
      return openA ? da.localeCompare(db) : db.localeCompare(da)
    })
    return items
  }, [assignments.items, filter])

  // height overhead: header(1) + col-headers(1) + divider(1) = 3
  const overheadRows = 3
  const maxVisible = Math.max(1, height - overheadRows)

  // Keep scroll window around selection
  React.useEffect(() => {
    if (selectedIndex < listScroll) setListScroll(selectedIndex)
    if (selectedIndex >= listScroll + maxVisible) setListScroll(selectedIndex - maxVisible + 1)
  }, [selectedIndex, maxVisible])

  useInput((input, key) => {
    if (showDetail) {
      if (key.escape) { setShowDetail(false); setDetail(null) }
      if (key.upArrow) setDetailScroll(s => Math.max(0, s - 1))
      if (key.downArrow) setDetailScroll(s => s + 1)
      return
    }
    if (key.upArrow) setSelectedIndex(i => Math.max(0, i - 1))
    if (key.downArrow) setSelectedIndex(i => Math.min(filteredItems.length - 1, i + 1))
    if (input === 'f') { setFilter(f => f === 'all' ? 'open' : f === 'open' ? 'closed' : 'all'); setSelectedIndex(0) }
    if (input === 'r') assignments.refresh()
    if (key.return) {
      const item = filteredItems[selectedIndex]
      if (!item?.Id) return
      setShowDetail(true)
      setDetailLoading(true)
      setDetailError(null)
      setDetailScroll(0)
      assignments.getDetail(item.Id)
        .then(d => { setDetail(d); setDetailLoading(false) })
        .catch(e => { setDetailError(e instanceof Error ? e.message : String(e)); setDetailLoading(false) })
    }
  })

  const filterLabel = filter === 'all' ? 'All' : filter === 'open' ? 'Open' : 'Closed'

  // Column widths
  const statusW = 10
  const deadlineW = 16
  const titleW = Math.max(16, width - statusW - deadlineW - 4)

  // Detail view
  if (showDetail) {
    const item = filteredItems[selectedIndex]
    const descLines = detail?.Omschrijving ? stripHtml(detail.Omschrijving).split('\n') : []
    // overhead: title(1) + deadline(1) + submitted(0-1) + divider(1) + hints(1) = ~4
    const contentLines = Math.max(1, height - 5)
    const visibleLines = descLines.slice(detailScroll, detailScroll + contentLines)

    return (
      <Box flexDirection="column" width={width} height={height} overflow="hidden" paddingX={1}>
        {detailLoading && <LoadingSpinner label="Loading assignment…" />}
        {detailError && <ErrorBanner message={detailError} />}
        {detail && !detailLoading && (
          <>
            <Text bold color="white">{truncate(detail.Titel ?? item?.Titel ?? '', width - 2)}</Text>
            {detail.InleverenVoor && (
              <Text color="gray">Deadline: {formatDate(detail.InleverenVoor)} {formatTime(detail.InleverenVoor)}</Text>
            )}
            {detail.IngeleverdOp && (
              <Text color="green">Submitted: {formatDate(detail.IngeleverdOp)}</Text>
            )}
            <Text color="gray">{'─'.repeat(Math.max(0, width - 2))}</Text>

            {detailScroll > 0 && <Text dimColor>↑ {detailScroll} lines above</Text>}

            {visibleLines.map((line, i) => (
              <Text key={i} wrap="wrap">{line || ' '}</Text>
            ))}

            {detailScroll + contentLines < descLines.length && (
              <Text dimColor>↓ {descLines.length - detailScroll - contentLines} lines below</Text>
            )}

            {descLines.length === 0 && <Text dimColor>(No description)</Text>}

            {detail.Bijlagen && detail.Bijlagen.length > 0 && (
              <Text color="yellow">⚑ {detail.Bijlagen.length} attachment(s)</Text>
            )}
          </>
        )}
        <Text dimColor>[esc] Back  [↑/↓] Scroll</Text>
      </Box>
    )
  }

  const visibleItems = filteredItems.slice(listScroll, listScroll + maxVisible)

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      {/* Header */}
      <Box flexDirection="row" gap={2} paddingX={1}>
        <Text dimColor>Filter: <Text color="cyan">{filterLabel}</Text>  ({filteredItems.length} items)</Text>
        {assignments.status === 'loading' && <Text color="cyan">⟳</Text>}
      </Box>

      {assignments.status === 'loading' && assignments.items.length === 0 && (
        <Box paddingX={1}><LoadingSpinner label="Loading assignments…" /></Box>
      )}
      {assignments.status === 'error' && assignments.error && (
        <Box paddingX={1}><ErrorBanner message={assignments.error} hint="[r] retry" /></Box>
      )}

      {assignments.status === 'success' && (
        <>
          {/* Column headers */}
          <Box flexDirection="row" paddingX={1}>
            <Text bold color="gray">{pad('TITLE', titleW)}</Text>
            <Text bold color="gray"> {pad('DEADLINE', deadlineW)}</Text>
            <Text bold color="gray"> {pad('STATUS', statusW)}</Text>
          </Box>
          <Box paddingX={1}><Text color="gray">{'─'.repeat(Math.min(width - 2, titleW + deadlineW + statusW + 4))}</Text></Box>

          {listScroll > 0 && (
            <Box paddingX={1}>
              <Text dimColor>↑ {listScroll} more above</Text>
            </Box>
          )}

          {visibleItems.map((item, vi) => {
            const i = listScroll + vi
            const selected = i === selectedIndex
            const status = getStatus(item)
            const color = assignmentStatusColor(status)
            const deadlineD = item.InleverenVoor ? parseDate(item.InleverenVoor) : null
            const deadlineStr = deadlineD
              ? `${formatDate(deadlineD)} ${formatTime(deadlineD)}`
              : '—'
            const bg = selected ? 'blue' : undefined

            return (
              <Box key={item.Id ?? i} flexDirection="row" paddingX={1} backgroundColor={bg}>
                <Box width={titleW}>
                  <Text bold={selected} color="white" backgroundColor={bg}>
                    {truncate(item.Titel ?? '(no title)', titleW)}
                  </Text>
                </Box>
                <Text backgroundColor={bg}> </Text>
                <Box width={deadlineW}>
                  <Text color="gray" backgroundColor={bg}>{truncate(deadlineStr, deadlineW)}</Text>
                </Box>
                <Text backgroundColor={bg}> </Text>
                <Box width={statusW}>
                  <Text color={color} bold={status === 'VERLOPEN'} backgroundColor={bg}>
                    {status}
                  </Text>
                </Box>
              </Box>
            )
          })}

          {listScroll + maxVisible < filteredItems.length && (
            <Box paddingX={1}>
              <Text dimColor>↓ {filteredItems.length - listScroll - maxVisible} more below</Text>
            </Box>
          )}

          {filteredItems.length === 0 && (
            <Box paddingX={1}>
              <Text dimColor>No assignments{filter !== 'all' ? ` (filter: ${filterLabel})` : ''}.</Text>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
