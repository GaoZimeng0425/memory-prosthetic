/**
 * Weight Calculation E2E Tests
 *
 * Tests for verifying the correct weight calculation for each association type
 *
 * AC 1: Time association max weight ≤ 0.36
 * AC 2: Tag association with 4 shared tags = 0.85
 * AC 3: Keyword association with 2/10 overlap = 0.16
 * AC 4: Folder association with 10 articles = 0.15
 */

import { test, expect } from '@playwright/test'

test.describe('Weight Calculation - Time Association', () => {
  test('should calculate time weight correctly (AC 1)', async ({ page }) => {
    // Create two articles 1 minute apart
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/article1')
    await page.click('button:has-text("Save")')

    // Wait and create second article
    await page.waitForTimeout(60000) // 1 minute
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/article2')
    await page.click('button:has-text("Save")')

    // Check associations
    await page.goto('/graph')
    await page.click('[data-testid="node-1"]')

    const weight = await page.locator('[data-testid="association-weight-time"]').textContent()
    const numericWeight = parseFloat(weight || '0')

    // Max weight should be 0.36 (0.3 * 1.2 boost)
    expect(numericWeight).toBeLessThanOrEqual(0.36)
  })

  test('should apply boost for very recent articles (< 1 minute)', async ({ page }) => {
    // This test requires articles created within 1 minute
    // The weight should be boosted by 1.2x

    await page.goto('/graph')
    await page.click('[data-testid="recent-articles-check"]')

    const boostedWeight = await page.locator('[data-testid="time-association-boosted"]').textContent()
    const normalWeight = await page.locator('[data-testid="time-association-normal"]').textContent()

    expect(parseFloat(boostedWeight || '0')).toBeGreaterThan(parseFloat(normalWeight || '0'))
  })
})

test.describe('Weight Calculation - Tag Association', () => {
  test('should calculate tag weight correctly (AC 2)', async ({ page }) => {
    // Create two articles with 4 shared tags
    const tags = ['rust', 'programming', 'tutorial', 'beginner']

    // Article 1
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/rust-1')
    await page.fill('[data-testid="article-tags"]', tags.join(', '))
    await page.click('button:has-text("Save")')

    // Article 2
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/rust-2')
    await page.fill('[data-testid="article-tags"]', tags.join(', '))
    await page.click('button:has-text("Save")')

    // Check tag association weight
    await page.goto('/graph')
    await page.click('[data-testid="node-1"]')

    const weight = await page.locator('[data-testid="association-weight-tag"]').textContent()
    const numericWeight = parseFloat(weight || '0')

    // 4 shared tags: min(4/4, 1.0) * 0.85 = 0.85
    expect(numericWeight).toBeCloseTo(0.85, 1)
  })

  test('should cap tag weight at maximum', async ({ page }) => {
    // Create articles with 8 shared tags (more than max)
    const tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8']

    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/tags-1')
    await page.fill('[data-testid="article-tags"]', tags.join(', '))
    await page.click('button:has-text("Save")')

    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/tags-2')
    await page.fill('[data-testid="article-tags"]', tags.join(', '))
    await page.click('button:has-text("Save")')

    await page.goto('/graph')
    await page.click('[data-testid="node-1"]')

    const weight = await page.locator('[data-testid="association-weight-tag"]').textContent()
    const numericWeight = parseFloat(weight || '0')

    // Should still be capped at 0.85
    expect(numericWeight).toBeLessThanOrEqual(0.85)
  })
})

test.describe('Weight Calculation - Keyword Association', () => {
  test('should calculate keyword weight correctly (AC 3)', async ({ page }) => {
    // Create article with 10 keywords
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/keywords-1')
    await page.fill('[data-testid="article-content"]', 'rust programming memory management ownership borrowing')
    await page.click('button:has-text("Save")')

    // Create second article with 2 shared keywords
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/keywords-2')
    await page.fill('[data-testid="article-content"]', 'rust ownership tutorial')
    await page.click('button:has-text("Save")')

    await page.goto('/graph')
    await page.click('[data-testid="node-1"]')

    const weight = await page.locator('[data-testid="association-weight-keyword"]').textContent()
    const numericWeight = parseFloat(weight || '0')

    // 2 shared / 10 total * 0.8 = 0.16
    expect(numericWeight).toBeCloseTo(0.16, 1)
  })

  test('should apply fallback discount when using fallback method', async ({ page }) => {
    await page.goto('/graph')
    await page.click('[data-testid="node-1"]')

    const normalWeight = await page.locator('[data-testid="keyword-weight-normal"]').textContent()
    const fallbackWeight = await page.locator('[data-testid="keyword-weight-fallback"]').textContent()

    // Fallback should be 0.7x normal
    expect(parseFloat(fallbackWeight || '0')).toBeCloseTo(
      parseFloat(normalWeight || '0') * 0.7,
      1
    )
  })
})

test.describe('Weight Calculation - Folder Association', () => {
  test('should calculate folder weight dynamically (AC 4)', async ({ page }) => {
    // Create a folder with 10 articles
    const folderName = 'Test Folder'

    await page.goto('/folders')
    await page.click('button:has-text("New Folder")')
    await page.fill('[data-testid="folder-name"]', folderName)
    await page.click('button:has-text("Create")')

    // Add 10 articles to folder
    for (let i = 1; i <= 10; i++) {
      await page.goto('/articles/new')
      await page.fill('[data-testid="article-url"]', `https://example.com/article-${i}`)
      await page.click('button:has-text("Save")')

      // Add to folder
      await page.click(`[data-testid="article-${i}-add-to-folder"]`)
      await page.click(`text=${folderName}`)
    }

    // Check folder association weight
    await page.goto('/graph')
    await page.click('[data-testid="node-1"]')

    const weight = await page.locator('[data-testid="association-weight-folder"]').textContent()
    const numericWeight = parseFloat(weight || '0')

    // 10 articles: 0.5 * (3.0 / 10) = 0.15
    expect(numericWeight).toBeCloseTo(0.15, 1)
  })

  test('should give higher weight to smaller folders', async ({ page }) => {
    // Create small folder (2 articles)
    await page.goto('/folders')
    await page.click('button:has-text("New Folder")')
    await page.fill('[data-testid="folder-name"]', 'Small Folder')
    await page.click('button:has-text("Create")')

    // Add 2 articles
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/small-1')
    await page.click('button:has-text("Save")')
    await page.click('[data-testid="add-to-small-folder"]')

    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/small-2')
    await page.click('button:has-text("Save")')
    await page.click('[data-testid="add-to-small-folder"]')

    await page.goto('/graph')
    await page.click('[data-testid="node-small-1"]')

    const smallFolderWeight = await page.locator('[data-testid="association-weight-folder"]').textContent()
    const numericWeight = parseFloat(smallFolderWeight || '0')

    // 2 articles: 0.5 * (3.0 / 3) = 0.5 (max weight)
    expect(numericWeight).toBeCloseTo(0.5, 1)
  })
})

test.describe('Weight Calculation - Semantic Association', () => {
  test('should use semantic similarity directly', async ({ page }) => {
    // Create two semantically similar articles
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/semantic-1')
    await page.fill('[data-testid="article-content"]', 'Rust is a systems programming language focused on safety and performance')
    await page.click('button:has-text("Save")')

    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/semantic-2')
    await page.fill('[data-testid="article-content"]', 'The Rust programming language emphasizes memory safety without garbage collection')
    await page.click('button:has-text("Save")')

    await page.goto('/graph')
    await page.click('[data-testid="node-semantic-1"]')

    const weight = await page.locator('[data-testid="association-weight-semantic"]').textContent()
    const numericWeight = parseFloat(weight || '0')

    // Semantic weight should be close to cosine similarity
    expect(numericWeight).toBeGreaterThan(0.7)
    expect(numericWeight).toBeLessThanOrEqual(1.0)
  })
})

test.describe('Weight Calculation - Domain Association', () => {
  test('should assign fixed weight for same domain', async ({ page }) => {
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/article-1')
    await page.click('button:has-text("Save")')

    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/article-2')
    await page.click('button:has-text("Save")')

    await page.goto('/graph')
    await page.click('[data-testid="node-1"]')

    const weight = await page.locator('[data-testid="association-weight-domain"]').textContent()
    const numericWeight = parseFloat(weight || '0')

    // Domain association should be exactly 0.4
    expect(numericWeight).toBe(0.4)
  })

  test('should not create association for different domains', async ({ page }) => {
    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://example.com/article-1')
    await page.click('button:has-text("Save")')

    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://another.com/article-2')
    await page.click('button:has-text("Save")')

    await page.goto('/graph')
    await page.click('[data-testid="node-1"]')

    // Domain association should not exist
    await expect(page.locator('[data-testid="association-weight-domain"]')).not.toBeVisible()
  })
})

test.describe('Weight Calculation - Combined Associations', () => {
  test('should show multiple association types with correct weights', async ({ page }) => {
    // Create articles with multiple association types
    const tags = ['rust', 'programming']
    const content = 'Rust ownership and borrowing'

    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://rust-lang.org/tutorial')
    await page.fill('[data-testid="article-tags"]', tags.join(', '))
    await page.fill('[data-testid="article-content"]', content)
    await page.click('button:has-text("Save")')

    await page.goto('/articles/new')
    await page.fill('[data-testid="article-url"]', 'https://rust-lang.org/guide')
    await page.fill('[data-testid="article-tags"]', tags.join(', '))
    await page.fill('[data-testid="article-content"]', content)
    await page.click('button:has-text("Save")')

    await page.goto('/graph')
    await page.click('[data-testid="node-1"]')

    // Should have semantic, tag, and domain associations
    await expect(page.locator('[data-testid="association-weight-semantic"]')).toBeVisible()
    await expect(page.locator('[data-testid="association-weight-tag"]')).toBeVisible()
    await expect(page.locator('[data-testid="association-weight-domain"]')).toBeVisible()

    // Semantic should have highest weight
    const semanticWeight = parseFloat(await page.locator('[data-testid="association-weight-semantic"]').textContent() || '0')
    const tagWeight = parseFloat(await page.locator('[data-testid="association-weight-tag"]').textContent() || '0')
    const domainWeight = parseFloat(await page.locator('[data-testid="association-weight-domain"]').textContent() || '0')

    expect(semanticWeight).toBeGreaterThanOrEqual(tagWeight)
    expect(tagWeight).toBeGreaterThanOrEqual(domainWeight)
  })
})
