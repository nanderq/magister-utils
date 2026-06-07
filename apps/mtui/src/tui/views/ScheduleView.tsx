import React, { useMemo, useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { MagisterClient, ScheduleItem } from '@magister/shared'
import { LoadingSpinner } from '../components/LoadingSpinner.tsx'
import { ErrorBanner } from '../components/ErrorBanner.tsx'
import { useSchedule } from '../hooks/useSchedule.ts'
import {
  getWeekDays, getWeekRange, formatDayHeader, formatDayShort,
  formatTime, getISOWeek, isToday, toApiDate
} from '../utils/dates.ts'
import { truncate, stripHtml } from '../utils/text.ts'

const STATUS_ALERT = 5

interface ScheduleViewProps {
  client: MagisterClient | null
  refreshTick: number
  width: number
  height: number
}

function hasHomework(item: ScheduleItem): boolean {
  const extra = item.Inhoud ?? item.Opmerking ?? (item as any).Aantekening ?? null
  if (!extra) return false
  return stripHtml(extra).length > 0
}

function getInfoLabel(item: ScheduleItem): string | null {
  if (!hasHomework(item)) return null
  switch ((item as any).InfoType) {
    case 1: return 'HW'
    case 2: return 'TEST'
    case 4: return 'SO'
    case 5: return 'MO'
    default: return 'NOTE'
  }
}

export function ScheduleView({ client, refreshTick, width, height }: ScheduleViewProps) {
  const schedule = useSchedule(client)
  const [showWeekend, setShowWeekend] = useState(false)

  React.useEffect(() => {
    if (refreshTick > 0) schedule.refresh()
  }, [refreshTick])

  useInput((input, key) => {
    if (key.leftArrow) schedule.setWeekOffset(schedule.weekOffset - 1)
    if (key.rightArrow) schedule.setWeekOffset(schedule.weekOffset + 1)
    if (input === 'w') setShowWeekend(v => !v)
  })

  const { from, to } = getWeekRange(schedule.weekOffset)
  const weekDays = getWeekDays(from)
  const week = getISOWeek(from)

  // Mon–Fri (5) or Mon–Sun (7), further capped by terminal width
  const maxDays = showWeekend ? 7 : 5
  const numDays = Math.min(maxDays, width >= 100 ? 7 : width >= 80 ? 6 : 5)
  const visibleDays = weekDays.slice(0, numDays)

  // Column layout: equal columns across full width
  const gap = 1
  const availableForDays = width - (numDays - 1) * gap
  const dayColWidth = Math.max(14, Math.floor(availableForDays / numDays))

  // Group items by day, sorted by Start
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>()
    for (const item of schedule.items) {
      if (!item.Start) continue
      const key = toApiDate(new Date(item.Start))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ta = a.Start ? new Date(a.Start).getTime() : Number.MAX_SAFE_INTEGER
        const tb = b.Start ? new Date(b.Start).getTime() : Number.MAX_SAFE_INTEGER
        return ta - tb
      })
    }
    return map
  }, [schedule.items])

  const subtitle = `Week ${week}  ${formatDayShort(from)} – ${formatDayShort(to)}`

  // Vertical budget: header(1) + day chips(1) + spacer(1) = 3
  const columnHeight = Math.max(1, height - 3)

  return (
    <Box flexDirection="column" width={width} height={height} overflow="hidden">
      {/* Week header */}
      <Box flexDirection="row" width={width}>
        <Text color="white" bold> {subtitle} </Text>
        <Text dimColor>[←/→] prev/next week  [w] {showWeekend ? 'hide' : 'show'} weekend</Text>
        {schedule.status === 'loading' && <Text color="cyan">  ⟳</Text>}
      </Box>

      {schedule.status === 'error' && schedule.error && (
        <ErrorBanner message={schedule.error} hint="[r] retry" />
      )}

      {/* Day chip row */}
      <Box flexDirection="row" gap={gap}>
        {visibleDays.map((day, i) => {
          const today = isToday(day)
          return (
            <Box key={i} width={dayColWidth}>
              <Text
                wrap="truncate-end"
                bold={today}
                color={today ? 'cyan' : 'white'}
                backgroundColor={today ? 'blue' : undefined}
              >
                {formatDayHeader(day).padEnd(dayColWidth)}
              </Text>
            </Box>
          )
        })}
      </Box>

      {/* Day columns with stacked cards */}
      {(schedule.status === 'success' || schedule.status === 'idle') && (
        <Box flexDirection="row" gap={gap} height={columnHeight}>
          {visibleDays.map((day, i) => {
            const key = toApiDate(day)
            const dayItems = byDay.get(key) ?? []
            const today = isToday(day)
            return (
              <Box key={i} flexDirection="column" width={dayColWidth} height={columnHeight} overflow="hidden">
                {dayItems.length === 0 ? (
                  <Text dimColor>{' '.repeat(dayColWidth)}</Text>
                ) : (
                  dayItems.map(item => (
                    <LessonCard
                      key={item.Id}
                      item={item}
                      width={dayColWidth}
                      isToday={today}
                    />
                  ))
                )}
              </Box>
            )
          })}
        </Box>
      )}

      {schedule.status === 'loading' && schedule.items.length === 0 && (
        <Box marginTop={1}><LoadingSpinner label="Loading schedule…" /></Box>
      )}

      {schedule.status === 'success' && schedule.items.length === 0 && (
        <Box marginTop={1}><Text dimColor>No lessons this week.</Text></Box>
      )}
    </Box>
  )
}

interface LessonCardProps {
  item: ScheduleItem
  width: number
  isToday: boolean
}

function LessonCard({ item, width, isToday }: LessonCardProps) {
  const alert = item.Status === STATUS_ALERT
  const infoLabel = getInfoLabel(item)

  const baseTitle = item.Omschrijving ?? ''
  const location = item.Lokatie?.trim() ?? ''
  const title = location ? `${baseTitle} (${location})` : baseTitle

  const startTime = item.Start ? formatTime(item.Start) : ''
  const endTime = item.Einde ? formatTime(item.Einde) : ''
  const timeStr = startTime && endTime ? `${startTime}-${endTime}` : startTime

  const lesson = item.LesuurVan != null ? String(item.LesuurVan) : '·'

  const innerWidth = Math.max(1, width - 2)
  const badgeStr = `[${lesson}]`
  const titleWidth = Math.max(1, innerWidth - badgeStr.length - 1)

  const titleColor = alert ? 'red' : 'white'
  const metaColor = alert ? 'red' : 'gray'

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={alert ? 'red' : isToday ? 'cyan' : 'gray'}
    >
      <Box flexDirection="row" width={innerWidth}>
        <Text color={alert ? 'red' : 'cyan'} bold>{badgeStr}</Text>
        <Text wrap="truncate-end" color={titleColor} bold={isToday && !alert}>
          {' '}{truncate(title, titleWidth).padEnd(titleWidth)}
        </Text>
      </Box>
      <Box flexDirection="row" width={innerWidth}>
        <Text color={metaColor} dimColor={!alert}>
          {truncate(timeStr, innerWidth - (infoLabel ? infoLabel.length + 1 : 0))}
        </Text>
        {infoLabel && (
          <Text color="yellow" bold> {infoLabel}</Text>
        )}
      </Box>
    </Box>
  )
}
