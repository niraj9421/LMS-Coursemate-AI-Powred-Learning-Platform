import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useSocket } from '@/hooks/useSocket'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'

interface ChatMsg {
  _id: string
  room: string
  userId: string
  userName: string
  userAvatar?: string
  body: string
  createdAt: string
}

const ROOMS = [
  { id: 'general',     label: 'general',     icon: <Icons.Chat className="h-4 w-4" /> },
  { id: 'javascript',  label: 'javascript',  icon: <Icons.Code className="h-4 w-4" /> },
  { id: 'react',       label: 'react',       icon: <Icons.Cpu className="h-4 w-4" /> },
  { id: 'python',      label: 'python',      icon: <Icons.Terminal className="h-4 w-4" /> },
  { id: 'interview',   label: 'interviews',  icon: <Icons.Mic className="h-4 w-4" /> },
  { id: 'placement',   label: 'placement',   icon: <Icons.Briefcase className="h-4 w-4" /> },
  { id: 'projects',    label: 'projects',    icon: <Icons.Rocket className="h-4 w-4" /> },
]

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function CommunityChatPage() {
  const { user, loading } = useRequireAuth()
  const socket = useSocket()

  const [activeRoom, setActiveRoom] = useState('general')
  const [messages, setMessages]     = useState<ChatMsg[]>([])
  const [input, setInput]           = useState('')
  const [connected, setConnected]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const prevRoom  = useRef<string>('')

  // Socket connection state
  useEffect(() => {
    const onConnect    = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect',    onConnect)
    socket.on('disconnect', onDisconnect)
    if (socket.connected) setConnected(true)
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect) }
  }, [socket])

  // Join room + receive history
  useEffect(() => {
    if (!connected) return

    // Leave previous room
    if (prevRoom.current && prevRoom.current !== activeRoom) {
      socket.emit('chat:leave', prevRoom.current)
    }
    prevRoom.current = activeRoom
    setMessages([])
    socket.emit('chat:join', activeRoom)

    const onHistory = (msgs: ChatMsg[]) => setMessages(msgs)
    socket.on('chat:history', onHistory)

    return () => { socket.off('chat:history', onHistory) }
  }, [socket, connected, activeRoom])

  // Receive new messages
  useEffect(() => {
    const onMessage = (msg: ChatMsg) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev
        return [...prev, msg]
      })
    }
    socket.on('chat:message', onMessage)
    return () => { socket.off('chat:message', onMessage) }
  }, [socket])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(() => {
    if (!input.trim() || !connected) return
    socket.emit('chat:send', { room: activeRoom, body: input.trim() })
    setInput('')
    inputRef.current?.focus()
  }, [socket, input, activeRoom, connected])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (loading || !user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )

  // Group messages by date
  const grouped: { date: string; msgs: ChatMsg[] }[] = []
  for (const msg of messages) {
    const d = dateLabel(msg.createdAt)
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== d) grouped.push({ date: d, msgs: [msg] })
    else last.msgs.push(msg)
  }

  const currentRoom = ROOMS.find(r => r.id === activeRoom)!

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-88px)] gap-0 rounded-2xl overflow-hidden border border-border bg-surface">

        {/* ── Sidebar — room list ─────────────────────────────────── */}
        <div className="w-48 shrink-0 border-r border-border bg-surface flex flex-col">
          <div className="px-3 py-3 border-b border-border">
            <h2 className="text-xs font-bold text-text uppercase tracking-wider">Community Chat</h2>
            <div className={`flex items-center gap-1.5 mt-1 text-xs ${connected ? 'text-success' : 'text-danger'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success' : 'bg-danger'}`} />
              {connected ? 'Connected' : 'Reconnecting…'}
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
            {ROOMS.map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  activeRoom === room.id
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-text-muted hover:bg-surface-secondary hover:text-text'
                }`}
              >
                <span className="shrink-0 text-text-muted">{room.icon}</span>
                <span className="truncate"># {room.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ── Main chat area ──────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-text flex items-center gap-1.5">
                <span className="text-text-muted">{currentRoom.icon}</span>
                # {currentRoom.label}
              </h3>
              <p className="text-xs text-text-muted">Real-time community chat</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
            {!connected && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-400 border-t-transparent mx-auto mb-2" />
                  <p className="text-xs text-text-muted">Connecting to chat…</p>
                </div>
              </div>
            )}

            {connected && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex justify-center mb-3 text-primary-400 opacity-60">{currentRoom.icon}</div>
                <h3 className="text-sm font-semibold text-text mb-1">
                  Welcome to # {currentRoom.label}!
                </h3>
                <p className="text-xs text-text-muted max-w-xs">
                  This is the beginning of this channel. Be the first to say something!
                </p>
              </div>
            )}

            {grouped.map(group => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] font-medium text-text-subtle px-2 rounded-full border border-border bg-surface-secondary">
                    {group.date}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Messages in this day group */}
                <div className="space-y-1">
                  {group.msgs.map((msg, i) => {
                    const isOwn = msg.userId === user._id
                    const showAvatar = i === 0 || group.msgs[i - 1]?.userId !== msg.userId

                    return (
                      <AnimatePresence key={msg._id}>
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-end gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {/* Avatar — only show for first in a consecutive block */}
                          <div className="w-7 shrink-0">
                            {showAvatar && !isOwn && (
                              <Avatar name={msg.userName} src={msg.userAvatar} size="xs" />
                            )}
                          </div>

                          <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                            {/* Name + time — only for first in block */}
                            {showAvatar && (
                              <div className={`flex items-baseline gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <span className="text-xs font-semibold text-text">
                                  {isOwn ? 'You' : msg.userName}
                                </span>
                                <span className="text-[10px] text-text-subtle">{timeStr(msg.createdAt)}</span>
                              </div>
                            )}

                            {/* Bubble */}
                            <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${
                              isOwn
                                ? 'bg-primary-600 text-white rounded-br-sm'
                                : 'bg-surface-secondary text-text rounded-bl-sm'
                            }`}>
                              {msg.body}
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    )
                  })}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 px-4 py-3 border-t border-border bg-surface">
            <div className="flex items-center gap-2">
              <Avatar name={user.name} src={user.avatar} size="sm" />
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-surface-secondary px-3 py-2 focus-within:border-primary-400 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 bg-transparent text-sm text-text placeholder-text-muted outline-none"
                  placeholder={connected ? `Message ${currentRoom.label}…` : 'Connecting…'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!connected}
                  maxLength={2000}
                />
                {input.length > 1800 && (
                  <span className="text-xs text-text-subtle shrink-0">{2000 - input.length}</span>
                )}
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={sendMessage}
                disabled={!input.trim() || !connected}
                className="shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
            <p className="text-[10px] text-text-subtle mt-1.5 px-1">
              Press Enter to send · Messages are visible to all community members
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
