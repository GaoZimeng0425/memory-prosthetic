/**
 * AI Settings Component
 *
 * Manages AI provider configuration, API keys, and model selection.
 * Uses Zustand store and context provider for state management.
 */

import { useState } from 'react'
import { Info, Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@memory-prosthetic/ui/components/ui/alert'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@memory-prosthetic/ui/components/ui/card'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { Label } from '@memory-prosthetic/ui/components/ui/label'
import { Switch } from '@memory-prosthetic/ui/components/ui/switch'
import { useAiConfigContext } from '@/providers/AiConfigProvider'
import { ModelSelect } from './ai/ModelSelect'
import { ProviderSelect } from './ai/ProviderSelect'

export const AiSettings = () => {
  const {
    provider,
    apiKey,
    baseURL,
    model,
    enabled,
    error,
    isValidating,
    isSaving,
    canValidate,
    canSave,
    setProvider,
    setApiKey,
    setBaseURL,
    setModel,
    setEnabled,
    saveConfig,
    validateApiKey,
  } = useAiConfigContext()

  const [success, setSuccess] = useState<string | null>(null)

  // Handle provider change with default model
  const handleProviderChange = (newProvider: typeof provider) => {
    setProvider(newProvider)
    // Model will be set automatically by store
  }

  // Validate API Key
  const handleValidate = async () => {
    setSuccess(null)
    const isValid = await validateApiKey()
    if (isValid) {
      setSuccess('API Key 验证成功')
    } else {
      setSuccess(null)
    }
  }

  // Save configuration
  const handleSave = async () => {
    setSuccess(null)
    try {
      await saveConfig()
      setSuccess('设置已保存')
    } catch {
      // Error is handled by store
    }
  }

  return (
    <div className="ai-settings space-y-6">
      <div>
        <h2 className="mb-4 font-bold text-2xl">AI 设置</h2>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            AI 功能需要将内容发送到云端服务提供商进行处理。 请确保您已阅读并同意相关服务提供商的隐私政策。
          </AlertDescription>
        </Alert>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本设置</CardTitle>
          <CardDescription>配置 AI 服务提供商和 API 密钥</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-enabled">启用 AI 功能</Label>
              <p className="text-muted-foreground text-sm">启用后，系统将自动为收集的内容生成摘要、标签等</p>
            </div>
            <Switch checked={enabled} id="ai-enabled" onCheckedChange={setEnabled} />
          </div>

          <ProviderSelect onValueChange={handleProviderChange} value={provider} />

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入您的 API Key"
              type="password"
              value={apiKey}
            />
            <p className="text-muted-foreground text-xs">您的 API Key 将加密存储在本地，不会上传到任何服务器</p>
          </div>

          {provider === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="base-url">API 端点</Label>
              <Input
                id="base-url"
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.example.com/v1"
                value={baseURL}
              />
            </div>
          )}

          <ModelSelect onValueChange={setModel} provider={provider} value={model} />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button disabled={!canValidate || isValidating} onClick={handleValidate} variant="outline">
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  验证中...
                </>
              ) : (
                '验证 API Key'
              )}
            </Button>
            <Button disabled={!canSave || isSaving} onClick={handleSave}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存设置'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
