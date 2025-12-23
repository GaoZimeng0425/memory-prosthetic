import { format, isThisWeek, isToday, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

/**
 * 格式化时间为相对显示
 * - 今天: 显示时间 (如 14:30)
 * - 其他: 显示日期 (如 12月23日)
 */
export function formatRelativeTime(dateString: string): string {
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString

  if (isToday(date)) {
    return format(date, 'HH:mm')
  }

  return format(date, 'M月d日', { locale: zhCN })
}

/**
 * 从 URL 中提取域名
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export interface TimeGroup<T> {
  label: string
  items: T[]
}

export interface GroupByTimeOptions<T> {
  getDate: (item: T) => Date | string
  labels?: {
    today?: string
    thisWeek?: string
    earlier?: string
  }
}

/**
 * 按时间分组（今天、本周、更早）
 */
export function groupByTime<T>(items: T[], options: GroupByTimeOptions<T>): TimeGroup<T>[] {
  const { getDate, labels = {} } = options
  const { today: todayLabel = '今天', thisWeek: thisWeekLabel = '本周', earlier: earlierLabel = '更早' } = labels

  const groups = {
    today: [] as T[],
    thisWeek: [] as T[],
    earlier: [] as T[],
  }

  for (const item of items) {
    const dateValue = getDate(item)
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue

    if (isToday(date)) {
      groups.today.push(item)
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      groups.thisWeek.push(item)
    } else {
      groups.earlier.push(item)
    }
  }

  const result: TimeGroup<T>[] = []

  if (groups.today.length > 0) {
    result.push({ label: todayLabel, items: groups.today })
  }
  if (groups.thisWeek.length > 0) {
    result.push({ label: thisWeekLabel, items: groups.thisWeek })
  }
  if (groups.earlier.length > 0) {
    result.push({ label: earlierLabel, items: groups.earlier })
  }

  return result
}
