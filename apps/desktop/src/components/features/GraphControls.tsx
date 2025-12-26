/**
 * Graph Controls Component
 *
 * Provides controls for filtering and configuring the graph view
 */

import { useState } from 'react'
import { RefreshCw, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'

import type { AssociationType, GraphFilters } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@memory-prosthetic/ui/components/ui/card'
import { Label } from '@memory-prosthetic/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memory-prosthetic/ui/components/ui/select'
import { Slider } from '@memory-prosthetic/ui/components/ui/slider'

interface GraphControlsProps {
  filters: GraphFilters
  onFiltersChange: (filters: GraphFilters) => void
  onRefresh?: () => void
  onResetLayout?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
}

const ASSOCIATION_TYPES: { value: AssociationType; label: string }[] = [
  { value: 'semantic', label: '语义关联' },
  { value: 'tag', label: '标签关联' },
  { value: 'folder', label: '收藏夹关联' },
  { value: 'time', label: '时间关联' },
  { value: 'domain', label: '领域关联' },
  { value: 'keyword', label: '关键词关联' },
  { value: 'topic', label: '主题关联' },
]

const LAYOUT_OPTIONS = [
  { value: 'force', label: '力导向布局' },
  { value: 'circular', label: '圆形布局' },
  { value: 'radial', label: '径向布局' },
  { value: 'grid', label: '网格布局' },
]

export function GraphControls({
  filters,
  onFiltersChange,
  onRefresh,
  onResetLayout,
  onZoomIn,
  onZoomOut,
}: GraphControlsProps) {
  const [layout, setLayout] = useState<string>('force')

  const handleMinWeightChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      minWeight: value[0],
    })
  }

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      types: value === 'all' ? undefined : [value as AssociationType],
    })
  }

  const handleMaxNodesChange = (value: string) => {
    onFiltersChange({
      ...filters,
      maxNodes: value === 'unlimited' ? undefined : Number.parseInt(value, 10),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>图谱控制</CardTitle>
        <CardDescription>调整图谱显示和筛选条件</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 权重阈值 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="min-weight">最小权重阈值</Label>
            <span className="text-muted-foreground text-sm">{filters.minWeight?.toFixed(2) ?? '0.00'}</span>
          </div>
          <Slider
            id="min-weight"
            max={1}
            min={0}
            onValueChange={handleMinWeightChange}
            step={0.05}
            value={[filters.minWeight ?? 0.3]}
          />
        </div>

        {/* 关联类型筛选 */}
        <div className="space-y-2">
          <Label>关联类型</Label>
          <Select onValueChange={handleTypeChange} value={filters.types?.[0] ?? 'all'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {ASSOCIATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 最大节点数 */}
        <div className="space-y-2">
          <Label>最大节点数</Label>
          <Select onValueChange={handleMaxNodesChange} value={filters.maxNodes?.toString() ?? 'unlimited'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unlimited">无限制</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 布局模式 */}
        <div className="space-y-2">
          <Label>布局模式</Label>
          <Select onValueChange={setLayout} value={layout}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAYOUT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 pt-2">
          {onRefresh && (
            <Button onClick={onRefresh} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          )}
          {onResetLayout && (
            <Button onClick={onResetLayout} size="sm" variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              重置布局
            </Button>
          )}
          {onZoomIn && (
            <Button onClick={onZoomIn} size="sm" variant="outline">
              <ZoomIn className="mr-2 h-4 w-4" />
              放大
            </Button>
          )}
          {onZoomOut && (
            <Button onClick={onZoomOut} size="sm" variant="outline">
              <ZoomOut className="mr-2 h-4 w-4" />
              缩小
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
