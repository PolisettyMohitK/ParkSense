import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@mui/material'
import { radius, timing } from '../theme'

/**
 * Minimal anchored popover.
 *
 * Deliberately not MUI's `Menu`: `Menu`/`MenuItem` children make TypeScript
 * blow past its union-instantiation limit in this project, and Stark Minimal
 * only ever needs a small, quiet, keyboard-navigable list — so we own it.
 *
 * Closes on outside click, on Escape, and on blur. Moves focus into the panel
 * on open and restores it on close.
 */
export function Popover({
  open,
  anchor,
  onClose,
  children,
  label,
  width = 208,
  align = 'right',
}: {
  open: boolean
  anchor: HTMLElement | null
  onClose: () => void
  children: ReactNode
  label: string
  width?: number
  align?: 'left' | 'right'
}) {
  const theme = useTheme()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (event.key === 'Tab' && active === last) {
        event.preventDefault()
        first.focus()
      } else if (event.key !== 'Tab' && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchor?.contains(target)) return
      onClose()
    }

    const onScroll = () => onClose()

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, onClose, anchor])

  useEffect(() => {
    if (!open) {
      restoreRef.current?.focus?.()
      return
    }
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('button, [href], input')?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  if (!open || !anchor || typeof document === 'undefined') return null

  const rect = anchor.getBoundingClientRect()
  const panel: CSSProperties = {
    position: 'fixed',
    top: Math.round(rect.bottom + 8),
    [align]: Math.round(Math.max(8, window.innerWidth - (align === 'right' ? rect.right : rect.left))),
    minWidth: width,
    zIndex: 1400,
    padding: 4,
    borderRadius: radius.control,
    border: `1px solid ${theme.stark.hairline}`,
    backgroundColor: theme.stark.surfaceRaised,
    boxShadow: theme.stark.shadowLightStrong,
    animation: `starkFadeIn ${timing.duration.fast}ms ${timing.easing.out}`,
  }

  return createPortal(
    <div ref={panelRef} role="menu" aria-label={label} style={panel} onClick={(event) => event.stopPropagation()}>
      {children}
    </div>,
    document.body,
  )
}

/** One row inside a `Popover`. */
export function PopoverItem({
  children,
  onClick,
  selected,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  selected?: boolean
  danger?: boolean
}) {
  const theme = useTheme()
  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minHeight: 34,
    padding: '6px 10px',
    border: 0,
    borderRadius: radius.chip,
    background: selected ? theme.palette.action.selected : 'transparent',
    color: danger ? theme.stark.status.occupied : theme.palette.text.primary,
    font: 'inherit',
    fontSize: 14,
    textAlign: 'left',
    cursor: 'pointer',
    transition: `background-color ${timing.duration.fast}ms ${timing.easing.out}`,
  }
  return (
    <button type="button" role="menuitem" aria-current={selected ? 'true' : undefined} style={style} onClick={onClick}>
      {children}
    </button>
  )
}

/** Non-interactive block inside a `Popover`. */
export function PopoverHeader({ children }: { children: ReactNode }) {
  return <div style={{ padding: '8px 10px' }}>{children}</div>
}

export function PopoverDivider() {
  const theme = useTheme()
  return <div style={{ height: 1, background: theme.stark.hairline, margin: '4px 0' }} />
}

/** Right-aligned trailing glyph, e.g. the check mark on the active option. */
export function PopoverGlyph({ children }: { children: ReactNode }) {
  return <span style={{ marginLeft: 'auto', display: 'grid', placeItems: 'center' }}>{children}</span>
}
