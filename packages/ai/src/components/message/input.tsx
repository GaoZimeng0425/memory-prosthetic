import { type ComponentProps, useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'

import type { Collection, CollectionListItem } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@memory-prosthetic/ui/components/ui/command'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@memory-prosthetic/ui/components/ui/popover'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'

export interface MentionGroup {
  id: number
  name: string
  items: CollectionListItem[]
}

interface ChatInputProps extends Omit<ComponentProps<'div'>, 'onChange' | 'value' | 'onSubmit'> {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onStop?: () => void
  placeholder?: string
  disabled?: boolean
  submitButtonText?: string
  stopButtonText?: string
  showStopButton?: boolean
  selectedContext?: Collection
  // Mention feature props
  mentionItems?: CollectionListItem[]
  mentionGroups?: MentionGroup[]
  onMentionSearch?: (query: CollectionListItem) => void
  enableMention?: boolean
}

export const ChatInput = ({
  value,
  onChange,
  onSubmit,
  onStop,
  placeholder = 'Type your message...',
  disabled = false,
  submitButtonText = 'Send',
  stopButtonText = 'Stop',
  showStopButton = false,
  selectedContext,
  mentionItems = [],
  mentionGroups = [],
  onMentionSearch,
  enableMention = true,
  className,
  ...props
}: ChatInputProps) => {
  console.log('🚀 : ChatInput : selectedContext:', selectedContext)
  const [inputValue, setInputValue] = useState(value)
  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !disabled) {
      let context = `你是非常优秀的AI助手, 一下是用户的问题:
${inputValue}
`
      if (selectedContext) {
        context += `
请用中文回答用户的问题, 并且在回答中引用用户提及的文章。

文章内容: \`\`\`
${selectedContext?.content}
\`\`\``
      }
      onSubmit(context)
      setInputValue('')
    }
  }

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault()
    onStop?.()
  }

  // 当外部value变化时，同步到内部状态
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // 检测 @ 符号并显示提及菜单
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart ?? 0

    setInputValue(newValue)
    onChange(newValue)
    setCursorPosition(cursorPos)

    if (!enableMention) return

    // 检测 @ 符号
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      // 检查 @ 符号前是否是空格或开头
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
      const isValidTrigger = charBeforeAt === ' ' || lastAtIndex === 0

      if (isValidTrigger) {
        const query = textBeforeCursor.slice(lastAtIndex + 1)
        // 检查 query 中是否有空格(如果有说明已经完成了提及)
        if (!query.includes(' ')) {
          setMentionQuery(query)
          setMentionStartPos(lastAtIndex)
          setShowMentionPopover(true)
          return
        }
      }
    }

    setShowMentionPopover(false)
    setMentionStartPos(null)
  }

  // 选择文章
  const handleSelectMention = (item: CollectionListItem) => {
    if (mentionStartPos === null) return

    const beforeMention = inputValue.slice(0, mentionStartPos)
    const afterMention = inputValue.slice(cursorPosition)

    // 构建提及文本，包含文章标题和内容摘要
    const mentionText = `@${item?.title}`

    const newValue = `${beforeMention + mentionText} ${afterMention}`
    const newValueWithContext = beforeMention + afterMention

    setInputValue(newValue)
    onChange(newValueWithContext) // 发送给父组件的值包含完整内容
    onMentionSearch?.(item)
    setShowMentionPopover(false)
    setMentionStartPos(null)

    // 将光标移到提及文本后
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length + 1
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // 合并 props.data 和 mentionItems
  const allMentionItems = [...mentionItems]

  // 过滤文章列表
  const filteredItems = mentionQuery
    ? allMentionItems.filter((item) => item.title.toLowerCase().includes(mentionQuery.toLowerCase()))
    : allMentionItems

  // 按分组过滤
  // const filteredGroups = mentionQuery
  //   ? mentionGroups
  //       .map((group) => ({
  //         ...group,
  //         items: group.items.filter((item) => item.title.toLowerCase().includes(mentionQuery.toLowerCase())),
  //       }))
  //       .filter((group) => group.items.length > 0)
  //   : mentionGroups

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && showMentionPopover) {
      e.preventDefault()
      setShowMentionPopover(false)
      setMentionStartPos(null)
    }
  }

  return (
    <div className={className} {...props}>
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <div className="relative flex-1">
          {enableMention && (
            <Popover onOpenChange={setShowMentionPopover} open={showMentionPopover}>
              <PopoverAnchor asChild>
                <Input
                  className="flex-1"
                  disabled={disabled}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  ref={inputRef}
                  value={inputValue}
                />
              </PopoverAnchor>
              <PopoverContent
                align="start"
                className="w-100 p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
                side="top"
              >
                <Command>
                  <CommandInput placeholder="搜索文章..." value={mentionQuery} />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>未找到文章</CommandEmpty>
                    <CommandGroup heading="文章">
                      <ScrollArea>
                        {filteredItems.map((item) => (
                          <CommandItem key={item.id} onSelect={() => handleSelectMention(item)} value={item.title}>
                            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-1 flex-col gap-1">
                              <span className="font-medium text-sm">{item.title}</span>
                              {item.type && <span className="text-muted-foreground text-xs">{item.type}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {showStopButton && onStop ? (
          <Button disabled={disabled} onClick={handleStop} type="button">
            {stopButtonText}
          </Button>
        ) : (
          <Button disabled={disabled || !inputValue.trim()} type="submit">
            {submitButtonText}
          </Button>
        )}
      </form>
    </div>
  )
}
