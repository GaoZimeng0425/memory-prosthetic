/**
 * AI Provider Select Component
 *
 * Reusable component for selecting AI provider
 */

import type { AiProvider } from '@memory-prosthetic/ai/config'
import { Label } from '@memory-prosthetic/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memory-prosthetic/ui/components/ui/select'

export interface ProviderSelectProps {
  value: AiProvider
  onValueChange: (value: AiProvider) => void
  id?: string
  label?: string
}

export function ProviderSelect({ value, onValueChange, id = 'provider', label = '服务提供商' }: ProviderSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select onValueChange={(v) => onValueChange(v as AiProvider)} value={value}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="anthropic">Anthropic</SelectItem>
          <SelectItem value="deepseek">DeepSeek</SelectItem>
          <SelectItem value="zhipu">智谱 AI (Zhipu)</SelectItem>
          <SelectItem value="custom">自定义 API</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
