import { useRef, useState } from 'react'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { streamText } from 'ai'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Input } from '@memory-prosthetic/ui/components/ui/input'

const ChatPage = () => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const messageRef = useRef<string>(null)
  const onChat = async (input: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: input }])
    const deepseek = createDeepSeek({
      baseURL: 'https://www.sophnet.com/api/open-apis/v1/',
      apiKey: 'g8wb1pJyqXUaxKoD1AR8tkEY_kWw4f-na9UMHedUSMY0YaxUVGMyI9Bq3MuBIYaxBk1qGFO2h-AUWejUC8bo4A',
    })
    const { textStream } = streamText({
      model: deepseek('deepseek-v3.2'),
      prompt: input,
    })
    for await (const chunk of textStream) {
      setCurrentMessage((prev) => prev + chunk)
      messageRef.current += chunk
    }
    setMessages((prev) => [...prev, { role: 'assistant', content: messageRef.current ?? '' }])
    setCurrentMessage('')
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex grow flex-col gap-4">
        {messages.map((message) => (
          <div key={message.content}>
            {message.role === 'user' ? 'User: ' : 'AI: '}
            {message.content}
          </div>
        ))}
        <div>{currentMessage}</div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setInput('')
          onChat(input)
        }}
      >
        <Input onChange={(e) => setInput(e.target.value)} placeholder="Say something..." value={input} />
        <Button type="submit">Submit</Button>
      </form>
    </div>
  )
}

export { ChatPage }
