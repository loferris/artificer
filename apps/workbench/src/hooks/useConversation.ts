import { useState, useCallback } from 'react'
import type { Message as BaseMessage } from '@/types'
import type { Operation, ValidationResult } from '@artificer/worldbuilder'

export interface Message extends BaseMessage {
  sources?: Source[]
  operations?: Operation[]
  validation?: ValidationResult[]
  streaming?: boolean
}

export interface Source {
  id: string
  title: string
  content: string
  url?: string
  score?: number
  matchedText?: string
}

export interface Conversation {
  id: string
  projectId?: string
  status: 'loose' | 'world'
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
}

export interface SendMessageOptions {
  sources?: Source[]
  operations?: Operation[]
  validation?: ValidationResult[]
  onStream?: (content: string) => void
}

export interface UseConversationOptions {
  initialMessages?: Message[]
  conversationId?: string
  onMessageAdded?: (message: Message) => void
}

export interface UseConversationReturn {
  conversation: Conversation
  messages: Message[]
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  deleteMessage: (id: string) => void
  clearMessages: () => void
  isLoading: boolean
}

/**
 * Hook for managing conversation state
 */
export function useConversation(
  options: UseConversationOptions = {}
): UseConversationReturn {
  const { initialMessages = [], conversationId, onMessageAdded } = options

  const [conversation, setConversation] = useState<Conversation>({
    id: conversationId || `conv-${Date.now()}`,
    status: 'loose',
    messages: initialMessages,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  const [isLoading, setIsLoading] = useState(false)

  const addMessage = useCallback((message: Message) => {
    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, message],
      updatedAt: new Date()
    }))
    onMessageAdded?.(message)
  }, [onMessageAdded])

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setConversation(prev => ({
      ...prev,
      messages: prev.messages.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
      updatedAt: new Date()
    }))
  }, [])

  const deleteMessage = useCallback((id: string) => {
    setConversation(prev => ({
      ...prev,
      messages: prev.messages.filter(msg => msg.id !== id),
      updatedAt: new Date()
    }))
  }, [])

  const clearMessages = useCallback(() => {
    setConversation(prev => ({
      ...prev,
      messages: [],
      updatedAt: new Date()
    }))
  }, [])

  const sendMessage = useCallback(async (
    content: string,
    options: SendMessageOptions = {}
  ) => {
    const { sources, operations, validation, onStream } = options

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: new Date()
    }
    addMessage(userMessage)

    setIsLoading(true)

    try {
      // Simulate API call - replace with actual Artificer API call
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: '',
        sources,
        operations,
        validation,
        streaming: true,
        timestamp: new Date()
      }
      addMessage(assistantMessage)

      // Simulate streaming - replace with actual streaming logic
      if (onStream) {
        const demoResponse = 'This is a demo response from the AI assistant.'
        for (const char of demoResponse) {
          await new Promise(resolve => setTimeout(resolve, 50))
          onStream(char)
          updateMessage(assistantMessage.id, {
            content: assistantMessage.content + char
          })
          assistantMessage.content += char
        }
      }

      updateMessage(assistantMessage.id, { streaming: false })
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }, [addMessage, updateMessage])

  return {
    conversation,
    messages: conversation.messages,
    sendMessage,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    isLoading
  }
}
