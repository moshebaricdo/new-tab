import { useEffect, useRef } from 'react'

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000

/**
 * Re-run `refresh` on an interval while the tab is visible,
 * and once immediately when the tab becomes visible again.
 */
export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  enabled: boolean,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!enabled) return

    const run = () => {
      if (document.visibilityState === 'hidden') return
      void refreshRef.current()
    }

    const id = window.setInterval(run, intervalMs)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshRef.current()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs])
}
