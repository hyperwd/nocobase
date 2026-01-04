# WebDAV 快速构建指南

本文档说明如何快速构建包含 WebDAV 支持的 NocoBase 镜像。

## 📋 前置要求

- Docker 已安装
- Git 已安装
- Node.js 20+ 和 Yarn 已安装
- 对 `/root/nocobase` 目录有访问权限

## 🚀 快速开始（推荐）

### 方式 1：使用快速构建脚本（最简单，2-5 分钟）

```bash
# 执行快速构建脚本
./quick-build-webdav.sh
```

**脚本会自动完成**：
1. ✅ 检查并拉取官方镜像（如果需要）
2. ✅ 编译 file-manager 插件
3. ✅ 验证 WebDAV 代码
4. ✅ 注入到容器
5. ✅ 生成新镜像
6. ✅ 启动测试容器

**预计耗时**：2-5 分钟

---

### 方式 2：使用 Dockerfile 快速构建（3-8 分钟）

```bash
# 构建镜像
docker build -f Dockerfile.webdav-fast \
  -t nocobase:webdav-fast \
  . 2>&1 | tee build-fast.log

# 查看构建日志
grep -E "(✅|❌|WebDAV)" build-fast.log

# 启动容器
docker run -d --name nocobase-webdav \
  -p 8080:80 \
  nocobase:webdav-fast
```

**预计耗时**：3-8 分钟

---

### 方式 3：完整构建（20-45 分钟，仅用于生产）

```bash
docker build -f Dockerfile.webdav \
  --build-arg COMMIT_HASH=$(git rev-parse --short HEAD) \
  -t nocobase:webdav-prod \
  . 2>&1 | tee build-prod.log
```

---

## 🔍 验证构建结果

### 1. 检查 WebDAV 插件是否存在

```bash
docker exec nocobase-webdav bash -c '
  PLUGIN_DIR="/app/nocobase/node_modules/@nocobase/plugin-file-manager"
  echo "=== WebDAV 插件验证 ==="
  echo "1. 插件目录: $(test -d $PLUGIN_DIR && echo "✅" || echo "❌")"
  echo "2. dist 目录: $(test -d $PLUGIN_DIR/dist && echo "✅" || echo "❌")"
  echo "3. webdav 客户端: $(grep -q "webdav" $PLUGIN_DIR/dist/client/index.js 2>/dev/null && echo "✅" || echo "❌")"
  echo "4. webdav 服务端: $(test -f $PLUGIN_DIR/dist/server/storages/webdav.js && echo "✅" || echo "❌")"
'
```

### 2. 查看容器日志

```bash
# 实时查看日志
docker logs -f nocobase-webdav

# 只看错误
docker logs nocobase-webdav 2>&1 | grep -i error

# 看 WebDAV 相关日志
docker logs nocobase-webdav 2>&1 | grep -i webdav
```

### 3. 界面验证

1. 访问 `http://localhost:8080`
2. 登录 NocoBase
3. 进入 **设置** → **文件管理器**
4. 点击 **添加新的存储**
5. 在 **存储类型** 下拉菜单中应该看到 **WebDAV**

---

## 🧪 测试 WebDAV 上传

### 1. 配置 WebDAV 存储

在文件管理器中添加 WebDAV 存储：

```
Base URL:        https://your-server.com
WebDAV URL:      https://your-server.com/remote.php/webdav
Username:        your-username
Password:        your-password
WebDAV Path:     /
```

### 2. 上传测试文件

选择一个小文件（< 1MB）上传，然后查看日志：

```bash
docker logs nocobase-webdav 2>&1 | grep -A 20 "WebDAV Upload"
```

**预期输出**：
```
[WebDAV Client] Creating axios client with baseURL: https://...
[WebDAV Upload] Starting upload: { filename: 'test.jpg', size: 12345, ... }
[WebDAV Upload] Using buffer/stream to upload
[WebDAV Upload] Upload completed successfully
```

---

## 🔧 常用命令

### 容器管理

```bash
# 查看容器状态
docker ps -a | grep nocobase-webdav

# 重启容器
docker restart nocobase-webdav

# 停止容器
docker stop nocobase-webdav

# 删除容器
docker rm nocobase-webdav

# 进入容器
docker exec -it nocobase-webdav bash
```

### 日志查看

```bash
# 实时日志
docker logs -f nocobase-webdav

# 最近 100 行
docker logs --tail 100 nocobase-webdav

# 带时间戳
docker logs -t nocobase-webdav
```

### 镜像管理

```bash
# 列出 WebDAV 镜像
docker images | grep nocobase.*webdav

# 删除旧镜像
docker rmi nocobase:webdav-old

# 清理未使用的镜像
docker image prune
```

---

## 📊 性能对比

| 构建方式 | 首次构建 | 修改后重构建 | 适用场景 |
|---------|---------|-------------|---------|
| **快速构建脚本** | 2-5 分钟 | 2-5 分钟 | 开发测试 |
| **Dockerfile 快速构建** | 3-8 分钟 | 3-8 分钟 | CI/CD |
| **完整构建** | 20-45 分钟 | 20-45 分钟 | 生产部署 |

---

## 🐛 故障排查

### 问题 1: 构建失败

**症状**：脚本执行失败，提示编译错误

**解决方案**：
```bash
# 查看完整构建日志
cat /tmp/build.log

# 检查语法错误
yarn build --scope=@nocobase/plugin-file-manager --no-dts
```

### 问题 2: WebDAV 选项未出现

**症状**：文件管理器中没有 WebDAV 选项

**解决方案**：
```bash
# 验证插件是否正确注入
docker exec nocobase-webdav bash -c '
  grep "webdav" /app/nocobase/node_modules/@nocobase/plugin-file-manager/dist/client/index.js
'

# 如果没有输出，重新构建
./quick-build-webdav.sh
```

### 问题 3: 上传失败 404

**症状**：上传文件时返回 404 错误

**解决方案**：
```bash
# 查看详细日志
docker logs nocobase-webdav 2>&1 | grep -A 30 "WebDAV Upload"

# 检查 WebDAV 配置
# 确认 WebDAV URL 格式正确
```

### 问题 4: 文件上传后为空

**症状**：文件上传成功但大小为 0

**解决方案**：
```bash
# 查看上传日志
docker logs nocobase-webdav 2>&1 | grep -B 5 -A 10 "WebDAV Upload"

# 检查是否有 buffer/stream 错误
# 确认 axios 超时配置是否生效
```

---

## 📝 开发工作流

### 修改代码后快速测试

```bash
# 1. 修改源代码
vim packages/plugins/@nocobase/plugin-file-manager/src/server/storages/webdav.ts

# 2. 重新编译
yarn build --no-dts --scope=@nocobase/plugin-file-manager

# 3. 重启容器
docker restart nocobase-webdav

# 4. 查看日志
docker logs -f nocobase-webdav
```

### 查看编译产物

```bash
# 客户端代码
cat packages/plugins/@nocobase/plugin-file-manager/dist/client/index.js | grep -A 5 "webdav"

# 服务端代码
cat packages/plugins/@nocobase/plugin-file-manager/dist/server/storages/webdav.js | head -30
```

---

## 🎯 生产部署

生产环境建议使用完整构建：

```bash
# 完整构建（包含所有验证步骤）
docker build -f Dockerfile.webdav \
  --build-arg COMMIT_HASH=$(git rev-parse --short HEAD) \
  -t nocobase:webdav-prod \
  . 2>&1 | tee build-prod.log

# 使用 docker-compose 部署
docker-compose -f docker-compose.yml up -d
```

---

## 📚 相关文档

- [NocoBase 官方文档](https://docs.nocobase.com/)
- [WebDAV 协议规范 (RFC 4918)](https://datatracker.ietf.org/doc/html/rfc4918)
- [Nextcloud WebDAV 文档](https://docs.nextcloud.com/server/latest/user_manual/files/access_webdav.html)

---

## 💡 提示

1. **首次构建**建议使用 `quick-build-webdav.sh` 脚本，最简单
2. **频繁修改**可以挂载源码，避免重复构建
3. **生产部署**使用完整构建，确保稳定性
4. **调试时**多查看日志，日志包含详细信息

---

**最后更新**: 2026-01-04
**维护者**: AI Assistant
