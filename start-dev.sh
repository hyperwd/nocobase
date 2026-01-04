#!/bin/bash
# NocoBase WebDAV 开发环境快速启动（简化版）
# 假设依赖已安装、数据库已初始化

set -e

# 确保 Volta 管理的 Node.js 版本生效
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

echo "🚀 启动 NocoBase 开发环境（WebDAV 测试）"
echo "========================================"
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. 检查 Node.js 版本
echo -e "${YELLOW}🔍 检查 Node.js 版本...${NC}"
NODE_VERSION=$(node --version)
if [[ ! "$NODE_VERSION" =~ "v20.14" ]]; then
    echo -e "${YELLOW}⚠️  当前 Node.js 版本: $NODE_VERSION"
    echo "   正在切换到 v20.14.0..."
    volta install node@20.14.0 yarn@1.22.19
fi
echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}"
echo ""

# 2. 检查数据库
echo -e "${YELLOW}📡 检查数据库...${NC}"
if ! docker ps | grep -q postgres; then
    echo -e "${RED}❌ 请先启动 PostgreSQL${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 数据库正常${NC}"
echo ""

# 3. 检查并构建 WebDAV 插件
echo -e "${YELLOW}🔨 检查 WebDAV 插件构建状态...${NC}"
cd /root/nocobase

if [ ! -f "packages/plugins/@nocobase/plugin-file-manager/lib/server/storages/webdav.js" ] || \
   [ "packages/plugins/@nocobase/plugin-file-manager/src/server/storages/webdav.ts" -nt "packages/plugins/@nocobase/plugin-file-manager/lib/server/storages/webdav.js" ]; then
    echo -e "${YELLOW}⚠️  WebDAV 代码有更新，构建中...${NC}"
    yarn build --filter=@nocobase/plugin-file-manager
    echo -e "${GREEN}✅ 构建完成${NC}"
else
    echo -e "${GREEN}✅ 插件已是最新${NC}"
fi
echo ""

# 4. 启动开发服务器
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 启动开发服务器${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📝 访问：${NC}http://localhost:13000"
echo -e "${YELLOW}👤 账号：${NC}admin@nocobase.com / admin123"
echo ""

yarn dev
