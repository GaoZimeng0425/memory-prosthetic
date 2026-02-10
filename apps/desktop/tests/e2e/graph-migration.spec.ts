/**
 * Graph Migration E2E Tests
 *
 * AC 21: Given 重复调用迁移 API，when 迁移正在进行，then 返回 409 Conflict
 * AC 22: Given 迁移失败，when 执行回滚，then 所有 v2 关联被删除
 */

import { test, expect } from '@playwright/test'

test.describe('Graph Migration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to graph page
    await page.goto('/graph')
  })

  test('should display migration status in settings', async ({ page }) => {
    // Navigate to settings
    await page.click('button:has-text("Settings")')

    // Check for migration section
    await expect(page.locator('text=Knowledge Graph')).toBeVisible()
    await expect(page.locator('text=Weight Algorithm Version')).toBeVisible()
  })

  test('should start migration when triggered', async ({ page }) => {
    await page.click('button:has-text("Settings")')

    // Click migrate button
    await page.click('button:has-text("Recalculate Associations")')

    // Confirm dialog
    await page.click('button:has-text("Confirm")')

    // Should show progress indicator
    await expect(page.locator('[data-testid="migration-progress"]')).toBeVisible()
  })

  test('should show progress during migration', async ({ page }) => {
    await page.click('button:has-text("Settings")')
    await page.click('button:has-text("Recalculate Associations")')
    await page.click('button:has-text("Confirm")')

    // Check progress bar
    const progressBar = page.locator('[data-testid="migration-progress-bar"]')
    await expect(progressBar).toBeVisible()

    // Check progress text
    const progressText = page.locator('[data-testid="migration-progress-text"]')
    await expect(progressText).toContainText(/\d+ \/ \d+/)
  })

  test('should allow canceling migration', async ({ page }) => {
    await page.click('button:has-text("Settings")')
    await page.click('button:has-text("Recalculate Associations")')
    await page.click('button:has-text("Confirm")')

    // Click cancel button
    await page.click('button[aria-label="Cancel migration"]')

    // Should stop migration
    await expect(page.locator('text=Migration canceled')).toBeVisible()
  })

  test('should prevent duplicate migration (AC 21)', async ({ page }) => {
    await page.click('button:has-text("Settings")')

    // Start first migration
    await page.click('button:has-text("Recalculate Associations")')
    await page.click('button:has-text("Confirm")')

    // Try to start second migration
    await page.click('button:has-text("Recalculate Associations")')

    // Should show error
    await expect(page.locator('text=Migration already in progress')).toBeVisible()
  })

  test('should rollback to v1 on request (AC 22)', async ({ page }) => {
    // First complete a migration
    await page.click('button:has-text("Settings")')
    await page.click('button:has-text("Recalculate Associations")')
    await page.click('button:has-text("Confirm")')

    // Wait for completion (with timeout for large databases)
    await expect(page.locator('text=Migration complete')).toBeVisible({ timeout: 300000 })

    // Now rollback
    await page.click('button:has-text("Rollback to v1")')
    await page.click('button:has-text("Confirm")')

    // Should confirm rollback
    await expect(page.locator('text=Rollback complete')).toBeVisible()
  })
})

test.describe('Graph Migration - Edge Cases', () => {
  test('should handle empty database gracefully', async ({ page }) => {
    await page.goto('/graph')
    await page.click('button:has-text("Settings")')

    // Try migration with no data
    await page.click('button:has-text("Recalculate Associations")')

    // Should show appropriate message
    await expect(page.locator('text=No associations to migrate')).toBeVisible()
  })

  test('should resume interrupted migration', async ({ page }) => {
    // Simulate interrupted migration by setting migration flag
    await page.evaluate(() => {
      localStorage.setItem('migration_in_progress', 'true')
      localStorage.setItem('migration_progress', '50/100')
    })

    await page.goto('/graph')
    await page.click('button:has-text("Settings")')

    // Should show resume option
    await expect(page.locator('button:has-text("Resume Migration")')).toBeVisible()
  })

  test('should handle network errors during migration', async ({ page }) => {
    // Simulate network failure
    await page.context().setOffline(true)

    await page.goto('/graph')
    await page.click('button:has-text("Settings")')
    await page.click('button:has-text("Recalculate Associations")')

    // Should show error
    await expect(page.locator('text=Migration failed')).toBeVisible()

    // Restore connection
    await page.context().setOffline(false)
  })
})

test.describe('Graph Migration - Performance', () => {
  test('should complete migration within expected time', async ({ page }) => {
    await page.goto('/graph')
    await page.click('button:has-text("Settings")')

    const startTime = Date.now()
    await page.click('button:has-text("Recalculate Associations")')
    await page.click('button:has-text("Confirm")')

    // Wait for completion
    await expect(page.locator('text=Migration complete')).toBeVisible({ timeout: 300000 })
    const duration = Date.now() - startTime

    // Should complete in reasonable time (adjust for your dataset size)
    expect(duration).toBeLessThan(300000) // 5 minutes max
  })
})
