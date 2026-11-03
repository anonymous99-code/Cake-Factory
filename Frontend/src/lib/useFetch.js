import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './api'

/** Loads data and exposes { data, loading, error, reload }. */
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const counter = useRef(0)

  const load = useCallback(async (silent = false) => {
    const id = ++counter.current
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const data = await fetcherRef.current()
      if (id === counter.current) setState({ data, loading: false, error: '' })
    } catch (e) {
      if (id === counter.current) setState((s) => ({ data: s.data, loading: false, error: errorMessage(e) }))
    }
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload: () => load(true), reloadLoud: () => load(false) }
}
