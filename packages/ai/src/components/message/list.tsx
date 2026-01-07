import { cn } from '@memory-prosthetic/ui/utils/tw'
import type { Message } from '../../hooks/useChat'
import { MessageItem } from './messageItem'

interface MessageListProps {
  messages: Message[]
  className?: string
}

export const MessageList = ({ messages, className }: MessageListProps) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {messages.map((message) => (
        <MessageItem className="rounded-md border border-muted" key={message.id} message={message} />
      ))}
    </div>
  )
}
