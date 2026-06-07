import React, { useState, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import { MagisterClient, GradeItem } from '@magister/shared'
import { LoadingSpinner } from '../components/LoadingSpinner.tsx'
import { ErrorBanner } from '../components/ErrorBanner.tsx'
import { useGrades } from '../hooks/useGrades.ts'
import { formatDate } from '../utils/dates.ts'
import { truncate } from '../utils/text.ts'

type GradeFilter = 'all' | 'failing'

interface GradesViewProps {
  client: MagisterClient | null
  refreshTick: number
  width: number
  height: number
}

export function GradesView({ client, refreshTick, width, height }: GradesViewProps) {
  const grades = useGrades(client)
  const [filter, setFilter] = useState<GradeFilter>('all')
  const [scrollOffset, setScrollOffset] = useState(0)

  React.useEffect(() => {
    if (refreshTick > 0) grades.refresh()
  }, [refreshTick])

  const items = useMemo(() => {
    let list = grades.items
      .filter(i =>
        i.CijferKolom?.KolomSoort === 1 &&
        (i.CijferId ?? 0) > 0 &&
        i.CijferStr != null
      )
      .sort((a, b) => {
        const da = a.DatumIngevoerd ? Date.parse(a.DatumIngevoerd) : -1
        const db = b.DatumIngevoerd ? Date.parse(b.DatumIngevoerd) : -1
        return db - da
      })
    if (filter === 'failing') list = list.filter(i => i.IsVoldoende === false)
    return list
  }, [grades.items, filter])

  // overhead: header(1)
  const maxVisible = Math.max(1, height - 1)

  useInput((input, key) => {
    if (input === 'f') { setFilter(f => f === 'all' ? 'failing' : 'all'); setScrollOffset(0) }
    if (key.upArrow) setScrollOffset(o => Math.max(0, o - 1))
    if (key.downArrow) setScrollOffset(o => Math.min(Math.max(0, items.length - maxVisible), o + 1))
  })

  const visible = items.slice(scrollOffset, scrollOffset + maxVisible)
  const filterLabel = filter === 'all' ? 'All' : 'Failing'

  // Grade takes ~6 chars on the right; subject+date take the rest
  const gradeW = 6
  const leftW = Math.max(10, width - gradeW - 4) // 4 = borders(2) + padding(2)

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      {/* Header */}
      <Box flexDirection="row" gap={2} paddingX={1}>
        {grades.schoolYear && <Text color="white">School year {grades.schoolYear}</Text>}
        <Text dimColor>Filter: <Text color="cyan">{filterLabel}</Text></Text>
        {grades.status === 'loading' && <Text color="cyan"> ⟳</Text>}
      </Box>

      {grades.status === 'error' && grades.error && (
        <ErrorBanner message={grades.error} hint="[r] retry" />
      )}

      {grades.status === 'loading' && grades.items.length === 0 && (
        <LoadingSpinner label="Loading grades…" />
      )}

      {grades.status === 'success' && (
        <>
          {scrollOffset > 0 && (
            <Box paddingX={1}>
              <Text dimColor> ↑ {scrollOffset} more above</Text>
            </Box>
          )}

          {visible.map((item, i) => (
            <GradeCard key={`${item.CijferId}-${i}`} item={item} width={width} leftW={leftW} gradeW={gradeW} />
          ))}

          {scrollOffset + maxVisible < items.length && (
            <Box paddingX={1}>
              <Text dimColor> ↓ {items.length - scrollOffset - maxVisible} more below</Text>
            </Box>
          )}

          {items.length === 0 && (
            <Box paddingX={1}>
              <Text dimColor>No grades found{filter !== 'all' ? ' (filter: Failing)' : ''}.</Text>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

interface GradeCardProps {
  item: GradeItem
  width: number
  leftW: number
  gradeW: number
}

function GradeCard({ item, width, leftW, gradeW }: GradeCardProps) {
  const subject = item.Vak?.Omschrijving ?? item.Vak?.Afkorting ?? 'Unknown'
  const grade = item.CijferStr ?? '-'
  const date = item.DatumIngevoerd ? formatDate(item.DatumIngevoerd) : ''
  const failing = item.IsVoldoende === false
  const gradeColor = failing ? 'red' : 'gray'

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="flex-start"
      width={width}
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      <Box flexDirection="column" width={leftW}>
        <Text color="white">{truncate(subject, leftW)}</Text>
        <Text dimColor>{date}</Text>
      </Box>
      <Box width={gradeW} justifyContent="flex-end">
        <Text color={gradeColor} bold={failing}>{grade}</Text>
      </Box>
    </Box>
  )
}
