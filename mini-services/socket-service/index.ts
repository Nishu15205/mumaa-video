import { createServer } from 'http'
import { Server } from 'socket.io'

// ─── State ─────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3003', 10)

const userSockets = new Map<string, any>()
const socketUsers = new Map<string, string>()
const onlineUsers = new Set<string>()
const onlineUserInfo = new Map<string, any>()

function getSocketByUserId(userId: string) { return userSockets.get(userId) || null }

function broadcastOnlineUsers() {
  try { io.emit('online-users', { users: Array.from(onlineUserInfo.values()) }) } catch { /* ignore */ }
}

// ─── HTTP Server with API routes ───────────────────────────────────────────

const httpServer = createServer(async (req, res) => {
  const url = req.url || '/'

  // Let Socket.IO handle its own paths
  if (url.startsWith('/socket.io')) {
    return
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  // Health check
  if (req.method === 'GET' && url === '/health') {
    const body = JSON.stringify({
      status: 'ok',
      onlineUsers: onlineUsers.size,
      onlineList: Array.from(onlineUsers),
    })
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': Buffer.byteLength(body),
    })
    res.end(body)
    return
  }

  // Emit event to a connected user
  if (req.method === 'POST' && url === '/emit') {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(chunk as Buffer)
      }
      const raw = Buffer.concat(chunks).toString()
      const { toUserId, event, data } = JSON.parse(raw)

      if (!toUserId || !event) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ error: 'toUserId and event required' }))
        return
      }

      const target = getSocketByUserId(toUserId)
      if (target) {
        target.emit(event, data || {})
        console.log(`[api] ${event} -> ${toUserId.slice(0, 8)}... ✓`)
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ success: true, delivered: true }))
      } else {
        console.log(`[api] ${event} -> ${toUserId.slice(0, 8)}... ✗ (offline)`)
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ success: true, delivered: false, reason: 'user_offline' }))
      }
    } catch (err) {
      console.error('[api] emit error:', err)
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ error: 'invalid json' }))
    }
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify({ error: 'Not Found' }))
})

// ─── Socket.IO ─────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    // Reflect the request origin dynamically (required for credentials)
    // Never use '*' with credentials: true — browsers reject it
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['*'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} (${io.sockets.sockets.size})`)

  try { socket.emit('online-users', { users: Array.from(onlineUserInfo.values()) }) } catch { /* ignore */ }

  socket.on('auth', (payload: any) => {
    try {
      const { userId, role } = payload || {}
      if (!userId || !role) return
      console.log(`[auth] ${userId.slice(0, 8)}... (${role})`)
      socket.data = { userId, role }
      userSockets.set(userId, socket)
      socketUsers.set(socket.id, userId)
      onlineUsers.add(userId)
      onlineUserInfo.set(userId, { userId, role, connectedAt: Date.now(), socketId: socket.id })
      socket.join(`user:${userId}`)
      socket.join(`role:${role.toLowerCase()}`)
      io.emit('user-online', { userId, role })
      broadcastOnlineUsers()
      socket.emit('auth-success', { userId, role })
      console.log(`[ok] ${userId.slice(0, 8)}... online (${onlineUsers.size})`)
    } catch (err) { console.error('[auth] err:', err) }
  })

  socket.on('incoming-call', (p: any) => {
    try {
      const { toUserId, callId, callerName, callType } = p || {}
      if (!socket.data?.userId) return
      const t = getSocketByUserId(toUserId)
      if (t) {
        t.emit('incoming-call', { callId, callerId: socket.data.userId, callerName: callerName || 'Unknown', callerAvatar: null, callType: callType || 'INSTANT' })
        console.log(`[call] incoming -> ${toUserId.slice(0, 8)}...`)
      } else {
        console.log(`[call] incoming -> ${toUserId.slice(0, 8)}... OFFLINE`)
        socket.emit('call-error', { callId, toUserId, error: 'User is currently offline' })
      }
    } catch (err) { console.error('[call] err:', err) }
  })

  socket.on('call-joined', (p: any) => {
    try {
      const { callId, toUserId } = p || {}
      if (!socket.data?.userId) return
      const t = getSocketByUserId(toUserId)
      if (t) {
        t.emit('call-joined', { callId, joinerId: socket.data.userId })
        console.log(`[call] joined -> ${toUserId.slice(0, 8)}...`)
      }
    } catch (err) { console.error('[call-joined] err:', err) }
  })

  socket.on('call-accepted', (p: any) => {
    try {
      const { callId, toUserId, roomName } = p || {}
      if (!socket.data?.userId) return
      const t = getSocketByUserId(toUserId)
      if (t) {
        t.emit('call-accepted', { callId, accepterId: socket.data.userId, roomName: roomName || null })
        console.log(`[call] accepted -> ${toUserId.slice(0, 8)}...`)
      }
    } catch (err) { console.error('[call-accepted] err:', err) }
  })

  socket.on('call-rejected', (p: any) => {
    try {
      const { callId, toUserId } = p || {}
      if (!socket.data?.userId) return
      const t = getSocketByUserId(toUserId)
      if (t) { t.emit('call-rejected', { callId, rejecterId: socket.data.userId }); console.log(`[call] rejected -> ${toUserId.slice(0, 8)}...`) }
    } catch (err) { console.error('[call-rejected] err:', err) }
  })

  socket.on('call-ended', (p: any) => {
    try {
      const { callId, toUserId, reason } = p || {}
      if (!socket.data?.userId) return
      const t = getSocketByUserId(toUserId)
      if (t) { t.emit('call-ended', { callId, enderId: socket.data.userId, reason }); console.log(`[call] ended -> ${toUserId.slice(0, 8)}...`) }
    } catch (err) { console.error('[call-ended] err:', err) }
  })

  socket.on('webrtc-offer', (p: any) => {
    try {
      const t = getSocketByUserId(p?.toUserId)
      if (t) {
        t.emit('webrtc-offer', { callId: p?.callId, fromUserId: socket.data?.userId, sdp: p?.sdp })
        console.log(`[webrtc] offer ${p?.callId?.slice(0, 6)} ${socket.data?.userId?.slice(0, 6)} -> ${p?.toUserId?.slice(0, 6)}`)
      } else {
        console.log(`[webrtc] offer -> ${p?.toUserId?.slice(0, 6)} OFFLINE`)
      }
    } catch (e) { console.error('[webrtc-offer] err:', e) }
  })
  socket.on('webrtc-answer', (p: any) => {
    try {
      const t = getSocketByUserId(p?.toUserId)
      if (t) {
        t.emit('webrtc-answer', { callId: p?.callId, fromUserId: socket.data?.userId, sdp: p?.sdp })
        console.log(`[webrtc] answer ${p?.callId?.slice(0, 6)} ${socket.data?.userId?.slice(0, 6)} -> ${p?.toUserId?.slice(0, 6)}`)
      } else {
        console.log(`[webrtc] answer -> ${p?.toUserId?.slice(0, 6)} OFFLINE`)
      }
    } catch (e) { console.error('[webrtc-answer] err:', e) }
  })
  socket.on('webrtc-ice-candidate', (p: any) => {
    try {
      const t = getSocketByUserId(p?.toUserId)
      if (t) {
        t.emit('webrtc-ice-candidate', { callId: p?.callId, fromUserId: socket.data?.userId, candidate: p?.candidate })
      }
    } catch (e) { console.error('[webrtc-ice] err:', e) }
  })

  socket.on('new-notification', (p: any) => {
    try {
      const t = getSocketByUserId(p?.toUserId)
      if (t) {
        t.emit('new-notification', { notification: { ...p.notification, timestamp: new Date().toISOString() } })
      }
    } catch { /* ignore */ }
  })

  socket.on('disconnect', (reason) => {
    try {
      const userId = socketUsers.get(socket.id)
      socketUsers.delete(socket.id)
      if (userId) {
        if (userSockets.get(userId) === socket) {
          userSockets.delete(userId)
          onlineUsers.delete(userId)
          onlineUserInfo.delete(userId)
          io.emit('user-offline', { userId, role: socket.data?.role })
          broadcastOnlineUsers()
        }
        console.log(`[-] ${socket.id} (${userId?.slice(0, 8)}...) — ${onlineUsers.size} online`)
      }
    } catch (err) { console.error('[disconnect] err:', err) }
  })

  socket.on('error', (e: any) => { console.error(`[!] ${socket.id}:`, e?.message || e) })
})

// ─── Start ─────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`Socket.IO + HTTP API on :${PORT}`)
  console.log('Ready!')
})

process.on('uncaughtException', (err) => { console.error('[!!!] Exception:', err) })
process.on('unhandledRejection', (reason) => { console.error('[!!!] Rejection:', reason) })
