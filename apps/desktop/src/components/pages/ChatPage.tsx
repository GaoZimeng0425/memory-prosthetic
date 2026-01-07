import { ChatInput } from '@memory-prosthetic/ai/components/message/input'
import { useChat } from '@memory-prosthetic/ai/hooks/useChat'
import { MarkdownUI } from '@memory-prosthetic/ui/components/markdown-ui'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { useCollections } from '@/hooks/use-collections'

const ChatPage = () => {
  const { messages, isLoading, sendMessage, stopGenerating } = useChat()
  const { collections } = useCollections({ status: 'active' })
  console.log('🚀 : ChatPage : collections:', collections)

  return (
    <div className="m-2 flex w-full flex-col gap-4 rounded-md border-l bg-sidebar shadow">
      <ScrollArea className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <MarkdownUI key={message.id} markdown={message.content} />
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
          onChange={() => {}}
          onStop={stopGenerating}
          onSubmit={sendMessage}
          placeholder="Type your message..."
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
