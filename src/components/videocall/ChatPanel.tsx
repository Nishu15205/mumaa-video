'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Send, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

interface ChatMessage {
  id: string
  text: string
  senderId: string
  senderName: string
  timestamp: Date
}

interface ChatPanelProps {
  open: boolean
  onClose: () => void
  otherParticipantName: string
  otherParticipantId: string
}

export function ChatPanel({ open, onClose, otherParticipantName, otherParticipantId }: ChatPanelProps) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !user) return

    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      text,
      senderId: user.id,
      senderName: user.name,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, msg])
    setInput('')

    // Simulate the other person reading/typing (demo only)
    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        text: getRandomReply(),
        senderId: otherParticipantId,
        senderName: otherParticipantName,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, autoReply])
    }, 1500 + Math.random() * 2000)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (!user) return null

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: open ? 0 : '100%', opacity: open ? 1 : 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute right-0 top-0 h-full w-80 sm:w-96 bg-white border-l border-gray-200 flex flex-col z-30 shadow-2xl"
      style={{ pointerEvents: open ? 'auto' : 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-semibold text-gray-900">In-Call Chat</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full hover:bg-gray-200"
        >
          <X className="w-4 h-4 text-gray-500" />
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 font-medium">No messages yet</p>
            <p className="text-xs text-gray-300 mt-1">Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === user.id
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-gray-400 font-medium">
                    {isSelf ? 'You' : otherParticipantName}
                  </span>
                </div>
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                    isSelf
                      ? 'bg-rose-500 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-300 mt-1 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-9 rounded-full border-gray-200 bg-gray-50 text-sm focus:ring-rose-500/20 focus:border-rose-400"
          />
          <Button
            type="submit"
            disabled={!input.trim()}
            size="icon"
            className="h-9 w-9 rounded-full bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </motion.div>
  )
}

// Demo auto-replies
function getRandomReply(): string {
  const replies = [
    "That sounds great! 😊",
    "Sure, I can help with that.",
    "Let me check on that for you.",
    "Thank you for letting me know!",
    "I'll get back to you shortly.",
    "The baby is doing wonderfully today! 🍼",
    "Would you like to schedule another session?",
    "Yes, I agree with you.",
    "I'll prepare the materials for next time.",
    "That's a lovely idea! 💕",
  ]
  return replies[Math.floor(Math.random() * replies.length)]
}
