#!/bin/bash

echo "🚀 启动 Twitter 监控机器人..."
echo "📁 工作目录: $(pwd)"
echo "🔧 检查依赖..."

# 检查 node 版本
node --version

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

echo "▶️ 启动机器人..."
npm start
