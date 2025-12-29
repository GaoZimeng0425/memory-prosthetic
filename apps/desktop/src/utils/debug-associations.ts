/**
 * Debug utility to check association statistics
 */
import { invoke } from '@tauri-apps/api/core'

import type { CommandResult } from '@memory-prosthetic/shared'

export const checkAssociationStats = async () => {
  try {
    const result =
      await invoke<
        CommandResult<{
          total_collections: number
          total_associations: number
          associations_by_type: Record<string, number>
          collections_with_associations: Record<number, number>
          potential_associations: Record<string, string[]>
        }>
      >('get_association_stats')

    console.log('=== 关联统计 ===')
    console.log(`总文章数: ${result.data.total_collections}`)
    console.log(`总关联数: ${result.data.total_associations}`)
    console.log('\n=== 关联类型统计 ===')
    for (const [type, count] of Object.entries(result.data.associations_by_type)) {
      console.log(`${type}: ${count}`)
    }

    console.log('\n=== 有关联的文章 ===')
    const collectionsWithAssocs = Object.entries(result.data.collections_with_associations)
    if (collectionsWithAssocs.length === 0) {
      console.log('没有文章有关联')
    } else {
      for (const [id, count] of collectionsWithAssocs) {
        console.log(`Collection ${id}: ${count} 个关联`)
      }
    }

    console.log('\n=== 潜在的关联（应该存在但可能未发现） ===')
    for (const [type, items] of Object.entries(result.data.potential_associations)) {
      if (items.length > 0) {
        console.log(`\n${type} 关联 (${items.length} 个):`)
        for (const item of items.slice(0, 10)) {
          console.log(`  - ${item}`)
        }
        if (items.length > 10) {
          console.log(`  ... 还有 ${items.length - 10} 个`)
        }
      }
    }

    return result.data
  } catch (error) {
    console.error('获取关联统计失败:', error)
    throw error
  }
}
