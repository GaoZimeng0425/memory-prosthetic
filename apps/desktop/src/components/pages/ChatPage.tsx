import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ChatInput } from '@memory-prosthetic/ai/components/message/input'
import { useChat } from '@memory-prosthetic/ai/hooks/useChat'
import { MarkdownUI } from '@memory-prosthetic/ui/components/markdown-ui'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { collections as collectionsApi } from '@/apis'
import { useCollections } from '@/hooks/use-collections'
import { cn } from '../../../../../packages/ui/src/utils/tw'
import type { CollectionListItem } from '../../types/api'

const ChatPage = () => {
  const [selectContext, setSelectContext] = useState<CollectionListItem | null>(null)
  const { messages, isLoading, sendMessage, stopGenerating } = useChat()
  const { collections } = useCollections({ status: 'active' })
  const { data: selectedArticle } = useQuery({
    ...collectionsApi.queries.detail(selectContext?.id ?? 0),
    enabled: !!selectContext?.id,
  })

  const isEmpty = !messages?.length

  return (
    <div className="m-2 flex w-full flex-col gap-4 rounded-md border-l bg-sidebar shadow">
      {isEmpty && <MessageEmpty />}
      <ScrollArea className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            className={cn(
              'flex w-full border-b p-4',
              message.role === 'user'
                ? 'border-blue-100 bg-blue-50'
                : message.role === 'assistant'
                  ? 'border-gray-100 bg-gray-50'
                  : 'border-red-100 bg-red-50'
            )}
            key={message.id}
          >
            <MarkdownUI isAnimating key={message.id} markdown={message.content} />
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full border-gray-100 border-b bg-gray-50 p-4">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-semibold text-gray-500 text-xs uppercase">assistant</span>
              </div>
              <div className="text-gray-800">Thinking...</div>
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4">
        <ChatInput
          disabled={isLoading}
          mentionItems={collections}
          onChange={(value) => {
            if (value === '') setSelectContext(null)
          }}
          onMentionSearch={(item) => {
            setSelectContext(item)
          }}
          onStop={stopGenerating}
          onSubmit={sendMessage}
          placeholder="Type your message..."
          selectedContext={selectedArticle}
          showStopButton={isLoading}
          stopButtonText="Stop"
          submitButtonText="Send"
          value=""
        />
        {isLoading && (
          <div className="mt-2 text-center text-gray-500 text-xs">Generating... Click "Stop" to cancel</div>
        )}
      </div>
    </div>
  )
}

export { ChatPage }

const MessageEmpty = () => {
  return <div className="flex h-full items-center justify-center text-lg text-muted-foreground">你想聊点啥?</div>
}
