import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Check, ExternalLink, Info, Keyboard, Monitor, Moon, Palette, Power, Sun, X } from 'lucide-react'

import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@memory-prosthetic/ui/components/ui/card'
import { Switch } from '@memory-prosthetic/ui/components/ui/switch'
import { type Theme, useTheme } from '@memory-prosthetic/ui/hooks/use-theme'
import type { AppSettings, CommandResult, ShortcutConfig } from '@/types/api'
import { formatShortcut } from '@/types/settings'

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: '浅色', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: '深色', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', label: '跟随系统', icon: <Monitor className="h-4 w-4" /> },
]

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedKeys, setRecordedKeys] = useState<ShortcutConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()

  const loadSettings = async () => {
    try {
      const result = await invoke<CommandResult<AppSettings>>('get_settings')
      setSettings(result.data)
    } catch (err) {
      setError(String(err))
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial load only
  useEffect(() => {
    void loadSettings()
  }, [])

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
      setSettings((prev) => (prev ? { ...prev, searchShortcut: recordedKeys } : null))
      setIsRecording(false)
      setRecordedKeys(null)
    } catch (err) {
      setError(String(err))
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

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

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
              {THEME_OPTIONS.map((option) => (
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
                  setSettings((prev) => (prev ? { ...prev, autoStart: checked } : null))
                } catch (err) {
                  setError(String(err))
                }
              }}
            />
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
