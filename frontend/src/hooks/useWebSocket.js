import { useState, useEffect, useRef, useCallback } from 'react'

export default function useWebSocket(path = '/ws') {
  const [lastEvent, setLastEvent] = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${protocol}//${host}${path}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => { setConnected(true) }

    ws.onmessage = (e) => {
      try { setLastEvent(JSON.parse(e.data)) } catch {}
    }

    ws.onclose = () => {
      setConnected(false)
      reconnectRef.current = setTimeout(connect, 5000)
    }

    ws.onerror = () => { ws.close() }
  }, [path])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  return { lastEvent, connected }
}