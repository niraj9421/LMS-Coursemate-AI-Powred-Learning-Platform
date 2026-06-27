import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { tokenStorage } from '@/services/api'

let _socket: Socket | null = null

/** Returns a singleton socket connection authenticated with the stored JWT. */
export function getSocket(): Socket {
  if (!_socket || _socket.disconnected) {
    _socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5001', {
      auth: { token: tokenStorage.getAccess() ?? '' },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    })
  }
  return _socket
}

/** Hook that returns a stable socket reference and disconnects on unmount if desired. */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = getSocket()
    return () => {
      // Don't disconnect on every unmount — the singleton persists across the session
    }
  }, [])

  return socketRef.current ?? getSocket()
}
