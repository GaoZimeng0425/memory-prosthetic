import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Check, Code, Copy, ExternalLink, Info, Keyboard, Palette, Power, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@memory-prosthetic/ui/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memory-prosthetic/ui/components/ui/select'
import { Switch } from '@memory-prosthetic/ui/components/ui/switch'
import { useTheme } from '@memory-prosthetic/ui/hooks/use-theme'
import type { AppSettings, AutoCleanupDeleted, CommandResult, ShortcutConfig } from '@/types/api'
import { formatShortcut } from '@/types/settings'

interface GeneralSettingsProps {
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
}

export function GeneralSettings({ settings, onSettingsChange }: GeneralSettingsProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedKeys, setRecordedKeys] = useState<ShortcutConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCopyingMcpConfig, setIsCopyingMcpConfig] = useState(false)
  const [isOpeningCursorConfig, setIsOpeningCursorConfig] = useState(false)
  const { theme, setTheme, themeOptions } = useTheme()

  const mcpServerUrl = `http://127.0.0.1:${settings.serverPort}/mcp`

  const mcpConfigForCursor = JSON.stringify(
    {
      mcpServers: {
        'memory-prosthetic': {
          url: mcpServerUrl,
        },
      },
    },
    null,
    2
  )

  const startRecording = () => {
    setIsRecording(true)
    setRecordedKeys(null)
    setError(null)
  }

  const cancelRecording = () => {
    setIsRecording(false)
    setRecordedKeys(null)
  }

  const saveShortcut = async () => {
    if (!recordedKeys) return

    try {
      await invoke<CommandResult<ShortcutConfig>>('update_shortcut', {
        shortcut: recordedKeys,
      })
      onSettingsChange({ ...settings, searchShortcut: recordedKeys })
      setIsRecording(false)
      setRecordedKeys(null)
    } catch (err) {
      setError(String(err))
    }
  }

  const copyMcpConfig = async () => {
    setIsCopyingMcpConfig(true)
    try {
      await navigator.clipboard.writeText(mcpConfigForCursor)
      toast.success('MCP 配置已复制到剪贴板')
    } catch (err) {
      toast.error(`复制失败: ${String(err)}`)
    } finally {
      setIsCopyingMcpConfig(false)
    }
  }

  const openCursorConfig = async () => {
    setIsOpeningCursorConfig(true)
    try {
      toast.success('已打开 Cursor 配置文件')
    } catch (err) {
      toast.error(`打开配置文件失败: ${String(err)}`)
    } finally {
      setIsOpeningCursorConfig(false)
    }
  }

  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Ignore modifier-only presses
      if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
        return
      }

      const config: ShortcutConfig = {
        useSuper: e.metaKey,
        useCtrl: e.ctrlKey,
        useShift: e.shiftKey,
        useAlt: e.altKey,
        key: e.code.replace('Key', '').replace('Digit', ''),
      }

      // Validate: must have at least one modifier
      if (!config.useSuper && !config.useCtrl && !config.useShift && !config.useAlt) {
        setError('快捷键必须包含至少一个修饰键（⌃、⌘、⇧、⌥）')
        return
      }

      setRecordedKeys(config)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRecording])

  return (
    <div className="space-y-6">
      {/* Shortcut Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Keyboard className="h-5 w-5" />
            全局快捷键
          </CardTitle>
          <CardDescription>设置用于快速唤起搜索窗口的快捷键组合</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">{error}</div>}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">搜索快捷键</p>
              <p className="text-muted-foreground text-xs">在任何应用中按下此组合键唤起搜索</p>
            </div>

            {isRecording ? (
              <div className="flex items-center gap-2">
                {recordedKeys ? (
                  <>
                    <Badge className="px-3 py-1 font-mono text-base" variant="secondary">
                      {formatShortcut(recordedKeys)}
                    </Badge>
                    <Button onClick={saveShortcut} size="sm" variant="default">
                      <Check className="mr-1 h-4 w-4" />
                      保存
                    </Button>
                    <Button onClick={cancelRecording} size="sm" variant="ghost">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge className="animate-pulse px-3 py-1" variant="outline">
                      按下新的快捷键...
                    </Badge>
                    <Button onClick={cancelRecording} size="sm" variant="ghost">
                      取消
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge className="px-3 py-1 font-mono text-base" variant="secondary">
                  {formatShortcut(settings.searchShortcut)}
                </Badge>
                <Button onClick={startRecording} size="sm" variant="outline">
                  修改
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            外观
          </CardTitle>
          <CardDescription>设置应用的主题外观</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">主题</p>
              <p className="text-muted-foreground text-xs">选择应用的颜色主题</p>
            </div>
            <div className="flex gap-1">
              {themeOptions.map((option) => (
                <Button
                  className="gap-1.5"
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value)
                  }}
                  size="sm"
                  variant={theme === option.value ? 'default' : 'outline'}
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Startup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Power className="h-5 w-5" />
            启动选项
          </CardTitle>
          <CardDescription>控制应用启动行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">开机自启动</p>
              <p className="text-muted-foreground text-xs">电脑开机后自动启动应用</p>
            </div>
            <Switch
              checked={settings.autoStart}
              onCheckedChange={async (checked) => {
                try {
                  await invoke<CommandResult<boolean>>('set_auto_start', { enabled: checked })
                  onSettingsChange({ ...settings, autoStart: checked })
                } catch (err) {
                  setError(String(err))
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto Cleanup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trash2 className="h-5 w-5" />
            自动清理
          </CardTitle>
          <CardDescription>自动永久删除"最近删除"中的过期内容</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">自动清理已删除内容</p>
              <p className="text-muted-foreground text-xs">定期清理超过指定时间的已删除内容</p>
            </div>
            <Select
              onValueChange={async (value: AutoCleanupDeleted) => {
                try {
                  await invoke<CommandResult<AutoCleanupDeleted>>('update_auto_cleanup_deleted', {
                    cleanup: value,
                  })
                  onSettingsChange({ ...settings, autoCleanupDeleted: value })
                } catch (err) {
                  setError(String(err))
                }
              }}
              value={settings.autoCleanupDeleted ?? 'disabled'}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">禁用</SelectItem>
                <SelectItem value="oneDay">1 天</SelectItem>
                <SelectItem value="sevenDays">7 天</SelectItem>
                <SelectItem value="thirtyDays">1 个月</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {settings.autoCleanupDeleted && settings.autoCleanupDeleted !== 'disabled' && (
            <div className="rounded-md bg-muted/50 p-3 text-muted-foreground text-xs">
              <p>
                已启用自动清理。超过{' '}
                {settings.autoCleanupDeleted === 'oneDay'
                  ? '1 天'
                  : settings.autoCleanupDeleted === 'sevenDays'
                    ? '7 天'
                    : '1 个月'}{' '}
                的已删除内容将被永久删除。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MCP Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code className="h-5 w-5" />
            MCP 配置
          </CardTitle>
          <CardDescription>配置 AI 助手（如 Cursor、Claude Desktop）连接到 Memory Prosthetic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">MCP 服务器地址</p>
              <p className="text-muted-foreground text-xs">AI 助手连接此地址以使用搜索功能</p>
            </div>
            <Badge className="font-mono" variant="outline">
              {mcpServerUrl}
            </Badge>
          </div>

          <div className="rounded-md border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-sm">Cursor 配置</p>
              <div className="flex gap-2">
                <Button disabled={isCopyingMcpConfig} onClick={copyMcpConfig} size="sm" variant="outline">
                  <Copy className="mr-1 h-4 w-4" />
                  复制配置
                </Button>
                <Button disabled={isOpeningCursorConfig} onClick={openCursorConfig} size="sm" variant="default">
                  <Code className="mr-1 h-4 w-4" />
                  打开 Cursor 配置
                </Button>
              </div>
            </div>
            <pre className="overflow-x-auto rounded bg-background p-3 text-xs">
              <code>{mcpConfigForCursor}</code>
            </pre>
            <p className="mt-2 text-muted-foreground text-xs">
              点击"打开 Cursor 配置"将自动打开配置文件并添加此配置。你也可以手动复制配置到 Cursor 的 MCP 配置文件中。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Server Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">HTTP 服务</CardTitle>
          <CardDescription>用于与浏览器扩展通信的本地服务</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">服务端口</p>
              <p className="text-muted-foreground text-xs">浏览器扩展连接此端口</p>
            </div>
            <Badge className="font-mono" variant="outline">
              {settings.serverPort}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            关于
          </CardTitle>
          <CardDescription>应用信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">版本</p>
            <Badge className="font-mono" variant="secondary">
              0.1.0
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">开源协议</p>
            <span className="text-muted-foreground text-sm">MIT</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">源代码</p>
            <a
              className="flex items-center gap-1 text-primary text-sm hover:underline"
              href="https://github.com/memory-prosthetic"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="pt-2 text-center text-muted-foreground text-xs">Memory Prosthetic - 你的第二大脑 🧠</p>
        </CardContent>
      </Card>
    </div>
  )
}
