import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Bot, Settings } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@memory-prosthetic/ui/components/ui/tabs'
import { AiSettings } from '@/components/features/AiSettings'
import { GeneralSettings } from '@/components/GeneralSettings'
import type { AppSettings, CommandResult } from '@/types/api'

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  const loadSettings = async () => {
    try {
      const result = await invoke<CommandResult<AppSettings>>('get_settings')
      setSettings(result.data)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial load only
  useEffect(() => {
    void loadSettings()
  }, [])

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <Tabs className="w-full" defaultValue="general">
      <TabsList className="mb-6">
        <TabsTrigger className="gap-2" value="general">
          <Settings className="h-4 w-4" />
          常规设置
        </TabsTrigger>
        <TabsTrigger className="gap-2" value="ai">
          <Bot className="h-4 w-4" />
          AI 设置
        </TabsTrigger>
      </TabsList>

      <TabsContent className="space-y-6" value="general">
        {settings && <GeneralSettings onSettingsChange={setSettings} settings={settings} />}
      </TabsContent>

      <TabsContent className="space-y-6" value="ai">
        <AiSettings />
      </TabsContent>
    </Tabs>
  )
}
