#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname as pathDirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cancel, confirm, isCancel, select, spinner } from '@clack/prompts'
import type { Block, KnownBlock } from '@slack/web-api'
import { ErrorCode, WebClient } from '@slack/web-api'
import chalk from 'chalk'
import { Command } from 'commander'
import { execa } from 'execa'

// Load .env file (Bun supports .env natively)
// Ensure .env is loaded before accessing process.env
const filename = fileURLToPath(import.meta.url)
const scriptDir = pathDirname(filename)
const rootDir = resolve(scriptDir, '..')
const outputDir = join(rootDir, '.output')

// Project types
type ProjectType = 'desktop' | 'browser-extension' | 'all'

interface BuildResult {
  project: ProjectType
  success: boolean
  version?: string
  artifacts: string[]
  error?: string
  duration: number
}

/**
 * 升级版本号的 patch 版本（最后一位）
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

/**
 * 更新 Cargo.toml 中的版本号
 */
const updateCargoVersion = (cargoPath: string, newVersion: string): void => {
  const content = readFileSync(cargoPath, 'utf-8')
  // 更新 [package] 部分的 version
  const updated = content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`)
  writeFileSync(cargoPath, updated, 'utf-8')
}

/**
 * 升级项目版本号
 */
const upgradeVersion = async (project: ProjectType): Promise<string | undefined> => {
  if (project === 'desktop') {
    const desktopPackagePath = join(rootDir, 'apps/desktop/package.json')
    const desktopTauriConfigPath = join(rootDir, 'apps/desktop/src-tauri/tauri.conf.json')
    const desktopCargoPath = join(rootDir, 'apps/desktop/src-tauri/Cargo.toml')

    const newVersion = updatePackageVersion(desktopPackagePath)
    updateTauriVersion(desktopTauriConfigPath, newVersion)
    updateCargoVersion(desktopCargoPath, newVersion)
    return newVersion
  }
  if (project === 'browser-extension') {
    const extensionPackagePath = join(rootDir, 'apps/browser-extension/package.json')
    const newVersion = updatePackageVersion(extensionPackagePath)
    return newVersion
  }
  if (project === 'all') {
    // Upgrade both
    const desktopPackagePath = join(rootDir, 'apps/desktop/package.json')
    const desktopTauriConfigPath = join(rootDir, 'apps/desktop/src-tauri/tauri.conf.json')
    const desktopCargoPath = join(rootDir, 'apps/desktop/src-tauri/Cargo.toml')
    const extensionPackagePath = join(rootDir, 'apps/browser-extension/package.json')

    const desktopVersion = updatePackageVersion(desktopPackagePath)
    updateTauriVersion(desktopTauriConfigPath, desktopVersion)
    updateCargoVersion(desktopCargoPath, desktopVersion)

    const extensionVersion = updatePackageVersion(extensionPackagePath)

    return `${desktopVersion} / ${extensionVersion}`
  }
  return undefined
}

/**
 * 构建 Desktop 应用
 */
const buildDesktop = async (): Promise<BuildResult> => {
  const startTime = Date.now()
  const artifacts: string[] = []

  try {
    // 构建 Tauri 应用
    await execa('bun', ['run', 'tauri', 'build'], {
      cwd: join(rootDir, 'apps/desktop'),
      stdio: 'inherit',
    })

    // 复制构建产物
    const desktopBundleDir = join(rootDir, 'apps/desktop/src-tauri/target/release/bundle')
    const dmgDir = join(desktopBundleDir, 'dmg')

    if (existsSync(dmgDir)) {
      const dmgFiles = readdirSync(dmgDir).filter((file) => file.endsWith('.dmg'))
      for (const dmgFile of dmgFiles) {
        cpSync(join(dmgDir, dmgFile), join(outputDir, dmgFile))
        artifacts.push(dmgFile)
      }
    }

    const duration = Date.now() - startTime
    return {
      project: 'desktop',
      success: true,
      artifacts,
      duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      project: 'desktop',
      success: false,
      artifacts: [],
      error: error instanceof Error ? error.message : String(error),
      duration,
    }
  }
}

/**
 * 构建 Browser Extension
 */
const buildBrowserExtension = async (): Promise<BuildResult> => {
  const startTime = Date.now()
  const artifacts: string[] = []

  try {
    // 构建扩展
    await execa('bun', ['run', 'zip'], {
      cwd: join(rootDir, 'apps/browser-extension'),
      stdio: 'inherit',
    })

    // 复制构建产物
    const extensionOutputDir = join(rootDir, 'apps/browser-extension/.output')

    if (existsSync(extensionOutputDir)) {
      const zipFiles = readdirSync(extensionOutputDir).filter((file) => file.endsWith('.zip'))
      for (const zipFile of zipFiles) {
        const zipPath = join(outputDir, zipFile)
        cpSync(join(extensionOutputDir, zipFile), zipPath)
        artifacts.push(zipFile)

        // 解压产物并保留原 zip
        const unzipDir = join(outputDir, zipFile.replace('.zip', ''))
        await execa('unzip', ['-o', zipPath, '-d', unzipDir])
        artifacts.push(zipFile.replace('.zip', ''))
      }
    }

    const duration = Date.now() - startTime
    return {
      project: 'browser-extension',
      success: true,
      artifacts,
      duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      project: 'browser-extension',
      success: false,
      artifacts: [],
      error: error instanceof Error ? error.message : String(error),
      duration,
    }
  }
}

/**
 * 发送 Slack 通知
 */
const sendSlackNotification = async (results: BuildResult[]): Promise<void> => {
  const token = process.env.SLACK_BOT_TOKEN
  const channel = process.env.SLACK_CHANNEL_ID

  if (!token || !channel) {
    console.log(chalk.yellow('⚠️  Slack 配置未找到，跳过通知'))
    return
  }

  try {
    const web = new WebClient(token)

    // 构建消息内容
    const blocks: (Block | KnownBlock)[] = []

    // 标题
    const allSuccess = results.every((r) => r.success)
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: allSuccess ? '✅ 构建成功' : '❌ 构建失败',
        emoji: true,
      },
    } as KnownBlock)

    // 详细信息
    const details: string[] = []
    for (const result of results) {
      const projectName =
        result.project === 'desktop' ? 'Desktop' : result.project === 'browser-extension' ? 'Browser Extension' : 'All'
      const status = result.success ? '✅' : '❌'
      const duration = `${(result.duration / 1000).toFixed(1)}s`

      details.push(`${status} ${projectName} (${duration})`)
      if (result.version) {
        details.push(`   版本: ${result.version}`)
      }
      if (result.artifacts.length > 0) {
        details.push(`   产物: ${result.artifacts.join(', ')}`)
      }
      if (result.error) {
        details.push(`   错误: ${result.error}`)
      }
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: details.join('\n'),
      },
    } as KnownBlock)

    // 发送消息
    await web.chat.postMessage({
      channel,
      text: allSuccess ? '构建成功' : '构建失败',
      blocks,
    })

    console.log(chalk.green('✅ Slack 通知已发送'))
  } catch (error: unknown) {
    // 处理 Slack API 错误
    // biome-ignore lint/suspicious/noExplicitAny: Slack API error type
    const slackError = error as any
    if (slackError && typeof slackError === 'object' && 'code' in slackError) {
      if (slackError.code === ErrorCode.PlatformError) {
        const platformError = slackError as { data?: { error?: string } }
        const errorType = platformError.data?.error

        if (errorType === 'channel_not_found') {
          console.error(
            chalk.red('❌ Slack 频道未找到'),
            chalk.yellow(`\n   频道 ID: ${channel}`),
            chalk.gray('\n   请检查：'),
            chalk.gray('\n   1. 频道 ID 是否正确'),
            chalk.gray('\n   2. Bot 是否已被邀请到该频道'),
            chalk.gray('\n   3. Bot 是否有权限访问该频道')
          )
        } else if (errorType === 'invalid_auth' || errorType === 'not_authed') {
          console.error(chalk.red('❌ Slack 认证失败'), chalk.gray('\n   请检查 SLACK_BOT_TOKEN 是否正确'))
        } else if (errorType === 'missing_scope') {
          console.error(
            chalk.red('❌ Slack Bot 缺少必要权限'),
            chalk.gray('\n   请确保 Bot 有以下权限：'),
            chalk.gray('\n   - chat:write'),
            chalk.gray('\n   - channels:read (如果是公开频道)'),
            chalk.gray('\n   - groups:read (如果是私有频道)')
          )
        } else {
          console.error(
            chalk.red(`❌ Slack API 错误: ${errorType || 'unknown'}`),
            chalk.gray(`\n   详细信息: ${JSON.stringify(platformError.data, null, 2)}`)
          )
        }
      } else {
        console.error(chalk.red('❌ 发送 Slack 通知失败:'), error)
      }
    } else {
      console.error(chalk.red('❌ 发送 Slack 通知失败:'), error)
    }
  }
}

/**
 * 主函数
 */
const main = async () => {
  const program = new Command()

  program
    .name('build')
    .description('构建项目')
    .option('-p, --project <type>', '项目类型: desktop, browser-extension, all')
    .option('-v, --version', '升级版本号')
    .option('--no-slack', '不发送 Slack 通知')
    .parse()

  const options = program.opts()

  // 选择项目
  let project: ProjectType
  if (options.project) {
    if (!['desktop', 'browser-extension', 'all'].includes(options.project)) {
      console.error(chalk.red(`❌ 无效的项目类型: ${options.project}`))
      process.exit(1)
    }
    project = options.project as ProjectType
  } else {
    const selected = await select({
      message: '选择要构建的项目',
      options: [
        { value: 'desktop', label: 'Desktop' },
        { value: 'browser-extension', label: 'Browser Extension' },
        { value: 'all', label: 'All (Desktop + Browser Extension)' },
      ],
    })

    if (isCancel(selected)) {
      cancel('操作已取消')
      process.exit(0)
    }

    project = selected as ProjectType
  }

  // 选择是否升级版本号
  let shouldUpgradeVersion = options.version
  if (shouldUpgradeVersion === undefined) {
    const confirmed = await confirm({
      message: '是否升级版本号？',
      initialValue: false,
    })

    if (isCancel(confirmed)) {
      cancel('操作已取消')
      process.exit(0)
    }

    shouldUpgradeVersion = confirmed
  }

  // 升级版本号
  let version: string | undefined
  if (shouldUpgradeVersion) {
    const s = spinner()
    s.start('升级版本号...')
    version = await upgradeVersion(project)
    s.stop(`版本号已升级: ${version}`)
  }

  // 确保输出目录存在 (不删除现有内容)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // 构建项目
  const results: BuildResult[] = []

  if (project === 'browser-extension' || project === 'all') {
    const s = spinner()
    s.start('构建 Browser Extension...')
    const result = await buildBrowserExtension()
    result.version = project === 'all' ? version?.split(' / ')[1] : version
    results.push(result)
    if (result.success) {
      s.stop(`✅ Browser Extension 构建完成 (${result.artifacts.length} 个产物)`)
    } else {
      s.stop(`❌ Browser Extension 构建失败: ${result.error}`)
    }
  }

  if (project === 'desktop' || project === 'all') {
    const s = spinner()
    s.start('构建 Desktop 应用...')
    const result = await buildDesktop()
    result.version = version?.split(' / ')[0] || undefined
    results.push(result)
    if (result.success) {
      s.stop(`✅ Desktop 构建完成 (${result.artifacts.length} 个产物)`)
    } else {
      s.stop(`❌ Desktop 构建失败: ${result.error}`)
    }
  }

  if (options.slack !== false) {
    // 发送 Slack 通知
    await sendSlackNotification(results)
  }

  // 总结
  console.log(`\n${chalk.bold('构建总结:')}`)
  for (const result of results) {
    const projectName =
      result.project === 'desktop' ? 'Desktop' : result.project === 'browser-extension' ? 'Browser Extension' : 'All'
    const status = result.success ? chalk.green('✅') : chalk.red('❌')
    console.log(`  ${status} ${projectName}`)
    if (result.version) {
      console.log(chalk.gray(`    版本: ${result.version}`))
    }
    if (result.artifacts.length > 0) {
      console.log(chalk.gray(`    产物: ${result.artifacts.join(', ')}`))
    }
    if (result.error) {
      console.log(chalk.red(`    错误: ${result.error}`))
    }
  }

  console.log(chalk.gray(`\n📁 输出目录: ${outputDir}`))

  if (results.some((r) => !r.success)) {
    // 如果有失败，退出码为 1
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(chalk.red('❌ 发生错误:'), error)
  process.exit(1)
})
