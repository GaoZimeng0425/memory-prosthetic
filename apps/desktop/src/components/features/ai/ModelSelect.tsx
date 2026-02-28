/**
 * AI Model Select Component
 *
 * Reusable component for selecting AI model based on provider
 */

import type { AiProvider } from '@memory-prosthetic/ai/config'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { Label } from '@memory-prosthetic/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memory-prosthetic/ui/components/ui/select'

export interface ModelSelectProps {
  provider: AiProvider
  value: string
  onValueChange: (value: string) => void
  id?: string
  label?: string
}

const MODEL_OPTIONS: Record<AiProvider, Array<{ value: string; label: string }>> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o-mini（推荐）' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku（推荐）' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek Chat（推荐）' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  ],
  zhipu: [
    { value: 'glm-5', label: 'GLM-5（推荐）' },
    { value: 'glm-4.7', label: 'GLM-4.7' },
    { value: 'glm-4.7-flash', label: 'GLM-4.7-Flash' },
  ],
  custom: [],
}

export function ModelSelect({ provider, value, onValueChange, id = 'model', label = '模型' }: ModelSelectProps) {
  if (provider === 'custom') {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} onChange={(e) => onValueChange(e.target.value)} placeholder="模型名称" value={value} />
      </div>
    )
  }

  const options = MODEL_OPTIONS[provider] || []

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
