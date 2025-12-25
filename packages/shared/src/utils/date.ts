import { TZDate } from '@date-fns/tz'
import { format, isThisWeek, isToday, isWithinInterval, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

/**
 * 获取用户本地时区
 */
const getLocalTimeZone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * 解析日期字符串为本地时区的 TZDate
 * 后端存储 UTC 时间（SQLite datetime('now')），前端显示本地时间
 */
const parseToLocalTZ = (dateString: string): TZDate => {
  const localTZ = getLocalTimeZone()

  // 如果已经有时区信息（Z 或 +/-），直接使用
  // 否则追加 'Z' 将其当作 UTC 解析
  const isoString = /[Zz]$/.test(dateString) || /[+-]\d{2}:\d{2}$/.test(dateString) ? dateString : `${dateString}Z`

  return new TZDate(isoString, localTZ)
}

/**
 * 格式化时间为完整日期时间
 * 显示格式: 2024年12月23日 14:30
 */
export const formatDateTime = (dateString: string): string => {
  return format(parseToLocalTZ(dateString), 'yyyy年M月d日 HH:mm', { locale: zhCN })
}

/**
 * 格式化时间为相对显示
 * - 今天: 显示时间 (如 14:30)
 * - 其他: 显示日期 (如 12月23日)
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = parseToLocalTZ(dateString)

  if (isToday(date)) {
    return format(date, 'HH:mm')
  }

  return format(date, 'M月d日', { locale: zhCN })
}

/**
 * 检查日期是否在最近 N 天内
 * @param dateString ISO 日期字符串
 * @param days 天数，默认 7
 */
export const isWithinDays = (dateString: string, days = 7): boolean => {
  const date = parseToLocalTZ(dateString)
  const now = new Date()
  return isWithinInterval(date, { start: subDays(now, days), end: now })
}

/**
 * 从 URL 中提取域名
 */
export const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export type TimeGroup<T> = {
  label: string
  items: T[]
}

export type GroupByTimeOptions<T> = {
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
export const groupByTime = <T>(items: T[], options: GroupByTimeOptions<T>): TimeGroup<T>[] => {
  const { getDate, labels = {} } = options
  const { today: todayLabel = '今天', thisWeek: thisWeekLabel = '本周', earlier: earlierLabel = '更早' } = labels

  const groups = {
    today: [] as T[],
    thisWeek: [] as T[],
    earlier: [] as T[],
  }

  for (const item of items) {
    const dateValue = getDate(item)
    const date = typeof dateValue === 'string' ? parseToLocalTZ(dateValue) : dateValue

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
