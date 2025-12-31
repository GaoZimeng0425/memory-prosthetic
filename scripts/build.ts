// @ts-expect-error - Bun types may not be available in TypeScript config
import { $ } from 'bun'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const Filename = fileURLToPath(import.meta.url)
const Dirname = dirname(Filename)
const rootDir = resolve(Dirname, '..')
const outputDir = join(rootDir, '.output')

/**
 * 升级版本号的 patch 版本（最后一位）
 * @param version 版本号字符串，如 "0.1.0"
 * @returns 升级后的版本号，如 "0.1.1"
 */
const bumpVersion = (version: string): string => {
  const parts = version.split('.').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`无效的版本号格式: ${version}`)
  }
  parts[2] += 1 // 增加 patch 版本
  return parts.join('.')
}

/**
 * 更新 package.json 中的版本号
 */
const updatePackageVersion = (packagePath: string): string => {
  const content = readFileSync(packagePath, 'utf-8')
  const pkg = JSON.parse(content)
  const oldVersion = pkg.version
  const newVersion = bumpVersion(oldVersion)
  pkg.version = newVersion
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8')
  return newVersion
}

/**
 * 更新 tauri.conf.json 中的版本号
 */
const updateTauriVersion = (tauriConfigPath: string, newVersion: string): void => {
  const content = readFileSync(tauriConfigPath, 'utf-8')
  const config = JSON.parse(content)
  config.version = newVersion
  writeFileSync(tauriConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
}

// 升级版本号
console.log('🔄 升级版本号...\n')

// 1. 升级 Desktop 版本号
const desktopPackagePath = join(rootDir, 'apps/desktop/package.json')
const desktopTauriConfigPath = join(rootDir, 'apps/desktop/src-tauri/tauri.conf.json')
const desktopNewVersion = updatePackageVersion(desktopPackagePath)
updateTauriVersion(desktopTauriConfigPath, desktopNewVersion)
console.log(`  ✓ Desktop: ${desktopNewVersion}`)

// 2. 升级 Browser Extension 版本号
const extensionPackagePath = join(rootDir, 'apps/browser-extension/package.json')
const extensionNewVersion = updatePackageVersion(extensionPackagePath)
console.log(`  ✓ Browser Extension: ${extensionNewVersion}\n`)

// 清理并创建输出目录
if (existsSync(outputDir)) {
  console.log('清理现有的 .output 目录...')
  await $`rm -rf ${outputDir}`
}
mkdirSync(outputDir, { recursive: true })

console.log('开始构建...\n')

// 1. 构建 Browser Extension
console.log('📦 构建 Browser Extension...')
try {
  await $`bun run zip`.cwd(join(rootDir, 'apps/browser-extension'))
  console.log('✅ Browser Extension 构建完成\n')
} catch (error) {
  console.error('❌ Browser Extension 构建失败:', error)
  process.exit(1)
}

// 2. 构建 Desktop (Tauri)
console.log('📦 构建 Desktop 应用...')
try {
  await $`bun run --filter '@memory-prosthetic/desktop' tauri build`.cwd(rootDir)
  console.log('✅ Desktop 构建完成\n')
} catch (error) {
  console.error('❌ Desktop 构建失败:', error)
  process.exit(1)
}
// 3. 复制 Desktop 构建产物 (DMG 文件)
console.log('📋 复制 Desktop 构建产物...')
const desktopBundleDir = join(rootDir, 'apps/desktop/src-tauri/target/release/bundle')
const dmgDir = join(desktopBundleDir, 'dmg')

if (existsSync(dmgDir)) {
  // 只复制 dmg 文件夹中的 .dmg 文件到 .output 根目录
  const dmgFiles = readdirSync(dmgDir).filter((file) => file.endsWith('.dmg'))

  if (dmgFiles.length > 0) {
    for (const dmgFile of dmgFiles) {
      cpSync(join(dmgDir, dmgFile), join(outputDir, dmgFile))
      console.log(`  ✓ 复制文件: ${dmgFile}`)
    }
    console.log('✅ Desktop 产物复制完成\n')
  } else {
    console.warn('⚠️  未找到 DMG 文件\n')
  }
} else {
  console.warn(`⚠️  DMG 目录不存在: ${dmgDir}\n`)
}

// 4. 复制 Browser Extension 构建产物 (ZIP 文件)
console.log('📋 复制 Browser Extension 构建产物...')
const extensionOutputDir = join(rootDir, 'apps/browser-extension/.output')

if (existsSync(extensionOutputDir)) {
  // 复制所有 .zip 文件到 .output 根目录
  const zipFiles = readdirSync(extensionOutputDir).filter((file) => file.endsWith('.zip'))

  if (zipFiles.length > 0) {
    for (const zipFile of zipFiles) {
      cpSync(join(extensionOutputDir, zipFile), join(outputDir, zipFile))
      console.log(`  ✓ 复制文件: ${zipFile}`)
    }
    console.log('✅ Browser Extension 产物复制完成\n')
  } else {
    console.warn('⚠️  未找到 Browser Extension zip 文件\n')
  }
} else {
  console.warn(`⚠️  Browser Extension 输出目录不存在: ${extensionOutputDir}\n`)
}

console.log('🎉 构建完成！所有产物已复制到 .output 目录')
console.log(`📁 输出目录: ${outputDir}`)
