import { createContext, useContext, type ReactNode } from 'react'
import { createTextAttributes } from '@opentui/core'
import {
  useKeyboard,
  type BoxProps as OpenTUIBoxProps,
  type TextProps as OpenTUITextProps,
} from '@opentui/react'

type BorderStyle = OpenTUIBoxProps['borderStyle'] | 'round'

export interface BoxProps extends Omit<OpenTUIBoxProps, 'borderStyle'> {
  borderStyle?: BorderStyle
}

/**
 * Small compatibility component for the old Ink-shaped view props. Rendering is
 * entirely OpenTUI; keeping the aliases here makes the view migration explicit
 * and prevents presentation details from leaking into every data view.
 */
export function Box({ borderStyle, ...props }: BoxProps) {
  const normalizedBorderStyle = borderStyle === 'round' ? 'rounded' : borderStyle
  return (
    <box
      {...props}
      border={props.border ?? normalizedBorderStyle != null}
      borderStyle={normalizedBorderStyle}
    />
  )
}

type InkWrap = 'wrap' | 'truncate' | 'truncate-start' | 'truncate-middle' | 'truncate-end'

export interface TextProps extends Omit<OpenTUITextProps, 'children'> {
  children?: ReactNode
  color?: OpenTUITextProps['fg']
  backgroundColor?: OpenTUITextProps['bg']
  bold?: boolean
  dimColor?: boolean
  italic?: boolean
  underline?: boolean
  inverse?: boolean
  strikethrough?: boolean
  wrap?: InkWrap
}

const InsideText = createContext(false)

/** Maps Ink's text conveniences to OpenTUI text renderables and inline spans. */
export function Text({
  children,
  color,
  backgroundColor,
  bold,
  dimColor,
  italic,
  underline,
  inverse,
  strikethrough,
  wrap,
  attributes = 0,
  ...props
}: TextProps) {
  const nested = useContext(InsideText)
  const combinedAttributes = attributes | createTextAttributes({
    bold,
    dim: dimColor,
    italic,
    underline,
    inverse,
    strikethrough,
  })

  if (nested) {
    return (
      <span fg={color} bg={backgroundColor} attributes={combinedAttributes}>
        {children}
      </span>
    )
  }

  return (
    <text
      {...props}
      fg={color ?? props.fg}
      bg={backgroundColor ?? props.bg}
      attributes={combinedAttributes}
      wrapMode={wrap === 'wrap' ? 'word' : props.wrapMode}
      truncate={wrap?.startsWith('truncate') ? true : props.truncate}
    >
      <InsideText.Provider value>{children}</InsideText.Provider>
    </text>
  )
}

export interface InputKey {
  ctrl: boolean
  shift: boolean
  tab: boolean
  return: boolean
  escape: boolean
  upArrow: boolean
  downArrow: boolean
  leftArrow: boolean
  rightArrow: boolean
}

/** OpenTUI keyboard events exposed with the narrow shape used by the views. */
export function useInput(handler: (input: string, key: InputKey) => void) {
  useKeyboard(event => {
    const input = event.sequence.length === 1 ? event.sequence : ''
    handler(input, {
      ctrl: event.ctrl,
      shift: event.shift,
      tab: event.name === 'tab',
      return: event.name === 'return',
      escape: event.name === 'escape',
      upArrow: event.name === 'up',
      downArrow: event.name === 'down',
      leftArrow: event.name === 'left',
      rightArrow: event.name === 'right',
    })
  })
}
