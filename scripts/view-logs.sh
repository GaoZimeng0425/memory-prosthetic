#!/bin/bash

# Memory Prosthetic - 日志查看脚本
# 用于快速查看应用日志和错误信息

echo "=== Memory Prosthetic 日志查看工具 ==="
echo ""

# 应用数据目录
APP_DATA_DIR="$HOME/Library/Application Support/com.aa00930.memory-prosthetic"

echo "1. 应用数据目录:"
echo "   $APP_DATA_DIR"
echo ""

# 检查应用数据目录
if [ -d "$APP_DATA_DIR" ]; then
    echo "   ✓ 目录存在"
    echo "   文件列表:"
    ls -lh "$APP_DATA_DIR" | tail -n +2 | awk '{print "   - " $9 " (" $5 ")"}'
else
    echo "   ✗ 目录不存在（应用可能还未运行过）"
fi

echo ""
echo "2. 系统日志（最近 1 小时的错误和警告）:"
echo "   正在查询..."
log show --predicate 'process == "desktop" OR senderImagePath contains "memory-prosthetic" OR processImagePath contains "memory-prosthetic"' --last 1h --style syslog 2>/dev/null | grep -iE "(error|warn|failed|invalid|panic)" | tail -20 || echo "   未找到相关日志"

echo ""
echo "3. 崩溃报告:"
CRASH_REPORTS="$HOME/Library/Logs/DiagnosticReports"
if [ -d "$CRASH_REPORTS" ]; then
    echo "   最近的崩溃报告:"
    ls -lt "$CRASH_REPORTS"/*desktop* 2>/dev/null | head -5 | awk '{print "   - " $9 " (" $6 " " $7 " " $8 ")"}'
else
    echo "   无崩溃报告"
fi

echo ""
echo "4. 实时日志监控（按 Ctrl+C 退出）:"
echo "   运行以下命令查看实时日志:"
echo "   log stream --predicate 'process == \"desktop\"'"
echo ""

echo "5. 查看所有日志（最近 1 小时）:"
echo "   运行以下命令:"
echo "   log show --predicate 'process == \"desktop\"' --last 1h"
echo ""
