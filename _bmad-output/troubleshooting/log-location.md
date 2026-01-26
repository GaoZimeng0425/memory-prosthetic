# 日志文件位置和查找方法

## 当前状态

应用使用 `tracing` 库进行日志记录，但目前**没有配置日志文件输出**。日志默认输出到：

1. **开发模式**：控制台输出
2. **发布模式**：macOS 系统日志

## 日志位置

### macOS 系统日志

在 macOS 上，应用的日志会写入系统日志。可以通过以下方式查看：

#### 方法 1：使用控制台应用

1. 打开 **应用程序** > **实用工具** > **控制台**
2. 在左侧边栏选择 **系统日志** 或 **崩溃报告**
3. 在搜索框中输入应用名称（如 `Memory Prosthetic` 或 `desktop`）
4. 筛选日志级别：`error`、`warn`、`info`

#### 方法 2：使用命令行

```bash
# 查看最近的错误日志
log show --predicate 'process == "desktop"' --last 1h --info

# 查看所有级别的日志
log show --predicate 'process == "desktop"' --last 1h

# 实时查看日志
log stream --predicate 'process == "desktop"'

# 查看崩溃日志
log show --predicate 'eventMessage contains "desktop"' --last 1h --style syslog
```

#### 方法 3：查看崩溃报告

```bash
# 查看崩溃报告目录
ls -la ~/Library/Logs/DiagnosticReports/

# 查看最近的崩溃报告
ls -lt ~/Library/Logs/DiagnosticReports/ | head -10
```

### 应用数据目录

应用数据目录位置（可能包含相关文件）：

**macOS:**

```
~/Library/Application Support/com.aa00930.memory-prosthetic/
```

包含的文件：

- `data.db` - 数据库文件
- `settings.json` - 设置文件
- `settings.json.bak` - 损坏设置的备份文件
- `models/` - 嵌入模型目录

## 建议：添加日志文件功能

为了更方便地查看日志，建议添加日志文件功能。日志文件可以保存在应用数据目录下。

### 实现方案

1. **添加日志文件写入功能**
   - 使用 `tracing-subscriber` 和 `tracing-appender`
   - 将日志写入 `app_data_dir/logs/app.log`
   - 支持日志轮转（按大小或日期）

2. **日志文件位置**

   ```
   ~/Library/Application Support/com.memory-prosthetic.desktop/logs/
   ├── app.log          # 当前日志
   ├── app.log.1        # 历史日志（轮转）
   └── app.log.2
   ```

## 快速查找错误的方法

### 1. 查看系统日志（推荐）

```bash
# 打开控制台应用，搜索应用名称
open -a Console
```

### 2. 使用命令行查看最近的错误

```bash
# 查看最近 1 小时的所有日志
log show --predicate 'process == "desktop"' --last 1h | grep -i error

# 查看最近的警告和错误
log show --predicate 'process == "desktop"' --last 1h | grep -E "(error|warn|ERROR|WARN)"
```

### 3. 检查应用数据目录

```bash
# 查看应用数据目录
ls -la ~/Library/Application\ Support/com.memory-prosthetic.desktop/

# 检查数据库文件
file ~/Library/Application\ Support/com.memory-prosthetic.desktop/data.db

# 检查设置文件
cat ~/Library/Application\ Support/com.memory-prosthetic.desktop/settings.json
```

## 常见错误日志关键词

在日志中搜索以下关键词可以快速定位问题：

- `Failed to initialize database` - 数据库初始化失败
- `Failed to initialize settings` - 设置初始化失败
- `Failed to get app data directory` - 应用数据目录获取失败
- `Invalid time value` - 时间值错误
- `Failed to parse created_at` - 时间解析失败
- `SQLite error` - SQLite 数据库错误
- `Failed to create Tokio runtime` - 运行时创建失败

## 下一步

如果需要添加日志文件功能，可以：

1. 在应用初始化时创建日志文件
2. 将日志同时输出到控制台和文件
3. 实现日志轮转，避免日志文件过大
