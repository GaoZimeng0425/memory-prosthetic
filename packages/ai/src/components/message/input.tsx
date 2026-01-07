import { type ComponentProps, useEffect, useRef, useState } from 'react'
import { FileText, Folder } from 'lucide-react'

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
import { Popover, PopoverContent } from '@memory-prosthetic/ui/components/ui/popover'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'

export interface MentionableItem {
  id: number
  title: string
  content: string
  type?: string
  url?: string
  favoriteId?: number
}

export interface MentionGroup {
  id: number
  name: string
  items: MentionableItem[]
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
  // Mention feature props
  mentionItems?: MentionableItem[]
  mentionGroups?: MentionGroup[]
  onMentionSearch?: (query: string) => void
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
  mentionItems = [],
  mentionGroups = [],
  onMentionSearch,
  enableMention = true,
  className,
  ...props
}: ChatInputProps) => {
  const [inputValue, setInputValue] = useState(value)
  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !disabled) {
      onSubmit(inputValue)
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
        console.log('🚀 : handleInputChange : query:', query)
        // 检查 query 中是否有空格(如果有说明已经完成了提及)
        if (!query.includes(' ')) {
          setMentionQuery(query)
          setMentionStartPos(lastAtIndex)
          setShowMentionPopover(true)
          onMentionSearch?.(query)
          return
        }
      }
    }

    setShowMentionPopover(false)
    setMentionStartPos(null)
  }

  // 选择文章
  const handleSelectMention = (item: MentionableItem) => {
    if (mentionStartPos === null) return

    const beforeMention = inputValue.slice(0, mentionStartPos)
    const afterMention = inputValue.slice(cursorPosition)

    // 构建提及文本，包含文章标题和内容摘要
    const mentionText = `@${item.title}`
    const contextText = `

--- 引用文章: ${item.title} ---
${item.content.slice(0, 500)}${item.content.length > 500 ? '...' : ''}
--- 引用结束 ---

`

    const newValue = `${beforeMention + mentionText} ${afterMention}`
    const newValueWithContext = beforeMention + contextText + afterMention

    setInputValue(newValue)
    onChange(newValueWithContext) // 发送给父组件的值包含完整内容
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

  // 过滤文章列表
  const filteredItems = mentionQuery
    ? mentionItems.filter(
        (item) =>
          item.title.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          item.content?.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : mentionItems

  // 按分组过滤
  const filteredGroups = mentionQuery
    ? mentionGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.title.toLowerCase().includes(mentionQuery.toLowerCase()) ||
              item.content?.toLowerCase().includes(mentionQuery.toLowerCase())
          ),
        }))
        .filter((group) => group.items.length > 0)
    : mentionGroups

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
          <Input
            className="flex-1"
            disabled={disabled}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={inputRef}
            value={inputValue}
          />

          {enableMention && showMentionPopover && (
            <Popover onOpenChange={setShowMentionPopover} open={showMentionPopover}>
              <PopoverContent
                align="start"
                className="w-100 p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
                side="top"
              >
                <Command>
                  <CommandInput placeholder="搜索文章..." value={mentionQuery} />
                  <CommandList>
                    <CommandEmpty>未找到文章</CommandEmpty>

                    {/* 显示分组 */}
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => (
                        <CommandGroup heading={group.name} key={group.id}>
                          {group.items.slice(0, 5).map((item) => (
                            <CommandItem key={item.id} onSelect={() => handleSelectMention(item)} value={item.title}>
                              <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-1 flex-col gap-1">
                                <span className="font-medium text-sm">{item.title}</span>
                                {item.type && <span className="text-muted-foreground text-xs">{item.type}</span>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))
                    ) : (
                      /* 显示未分组的文章 */
                      <CommandGroup heading="文章">
                        <ScrollArea className="max-h-[300px]">
                          {filteredItems.slice(0, 10).map((item) => (
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
                    )}
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
