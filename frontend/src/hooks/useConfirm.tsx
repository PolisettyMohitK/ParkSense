import { useCallback, useRef, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
}

/**
 * Promise-based confirmation for destructive actions:
 *   const [confirm, confirmDialog] = useConfirm()
 *   if (await confirm({ title: 'Delete vehicle?', message: '…' })) remove(id)
 * Render `confirmDialog` once in the component.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }

  const dialog = (
    <ConfirmDialog
      open={options !== null}
      title={options?.title ?? ''}
      message={options?.message ?? ''}
      confirmLabel={options?.confirmLabel}
      onConfirm={() => settle(true)}
      onClose={() => settle(false)}
    />
  )

  return [confirm, dialog] as const
}
