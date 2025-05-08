"use client"

import { useCallback, useEffect, useState } from "react"

export function useResizeObserver<T extends HTMLElement>() {
  const [width, setWidth] = useState<number | undefined>(undefined)
  const [ref, setRef] = useState<T | null>(null)

  const setObservedRef = useCallback((element: T | null) => {
    setRef(element)
  }, [])

  useEffect(() => {
    if (!ref) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setWidth(entry.contentRect.width)
        }
      }
    })

    resizeObserver.observe(ref)

    return () => {
      resizeObserver.disconnect()
    }
  }, [ref])

  return [setObservedRef, width] as const
}
