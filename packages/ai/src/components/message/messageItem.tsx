import { cn } from '@memory-prosthetic/ui/utils/tw'
import type { Message } from '../../hooks/useChat'

interface MessageItemProps {
  message: Message
  className?: string
}

export const MessageItem = ({ message, className }: MessageItemProps) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  // const isSystem = message.role === 'system'

  return (
    <div
      className={cn(
        'flex w-full border-b p-4',
        isUser ? 'border-blue-100 bg-blue-50' : isAssistant ? 'border-gray-100 bg-gray-50' : 'border-red-100 bg-red-50',
        className
      )}
    >
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-semibold text-gray-500 text-xs uppercase">{message.role}</span>
        </div>
        <div className="whitespace-pre-wrap text-gray-800">{message.content}</div>
      </div>
    </div>
  )
}
