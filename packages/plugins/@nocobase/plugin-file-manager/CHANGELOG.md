# WebDAV 文件预览功能 - 改动总结

## 📋 改动概览

**功能**: 修复 WebDAV 存储的文件在 iframe 预览时的 401 认证错误

**改动文件数**: 6 个
- ⚠️ **核心包**: 1 个 (需要注意升级合并)
- ✅ **插件包**: 5 个 (自动合并)

---

## 🔴 需要关注的改动 (升级时需手动合并)

### packages/core/client/src/schema-component/antd/upload/Upload.tsx

**改动类型**: 修改核心上传组件
**冲突风险**: 🟡 中等
**是否必须**: 是 (否则 WebDAV 文件预览功能失效)

**改动内容**:
- 新增 `useAPIClient` 导入
- 在 `IframePreviewer` 组件中自动为下载 URL 添加 token 参数
- 改动约 20 行代码

**快速检查命令**:
```bash
git diff packages/core/client/src/schema-component/antd/upload/Upload.tsx
```

**Patch 文件位置**:
```
packages/plugins/@nocobase/plugin-file-manager/patches/core-upload-webdav-preview.patch
```

---

## ✅ 安全的改动 (自动合并)

### 1. src/server/actions/attachments.ts
- 新增 `downloadWithToken` action (支持 URL 参数 token)
- 在 `download` action 中添加 CORS 头

### 2. src/server/actions/index.ts
- 注册 `downloadWithToken` action

### 3. src/server/server.ts
- ACL 配置: 允许 `downloadWithToken` action

### 4. src/server/storages/webdav.ts
- 修改 `getFileURL()` 返回 `downloadWithToken` 端点

### 5. src/server/storages/index.ts
- 小改动 (导入或配置)

---

## 🚀 升级流程

### 自动升级脚本 (推荐)

```bash
#!/bin/bash
# upgrade-webdav.sh

echo "🔄 开始升级 WebDAV 预览功能补丁..."

# 1. 应用核心包 patch
echo "📦 应用核心包补丁..."
git apply packages/plugins/@nocobase/plugin-file-manager/patches/core-upload-webdav-preview.patch

# 2. 检查是否有冲突
if [ $? -ne 0 ]; then
  echo "⚠️  检测到冲突，请手动解决"
  echo "📖 冲突文件: packages/core/client/src/schema-component/antd/upload/Upload.tsx"
  echo "📚 请参考: UPGRADE_GUIDE.md"
  exit 1
fi

# 3. 重新构建
echo "🔨 重新构建..."
pnpm build

echo "✅ 升级完成！"
```

### 手动升级步骤

详见 [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md)

---

## 📊 影响评估

### 未来版本升级

| 升级场景 | 影响程度 | 处理方式 |
|---------|---------|---------|
| **小版本升级** (1.0.x → 1.0.y) | 🟢 低 | 通常无冲突，直接合并 |
| **中版本升级** (1.0.x → 1.1.0) | 🟡 中 | 可能需要手动合并 Upload.tsx |
| **大版本升级** (1.x → 2.0) | 🔴 高 | 需要重新实现或大幅调整 |

### NocoBase 官方合并可能性

**如果这个功能被官方采纳**:
- ✅ 核心包改动将被合并到主分支
- ✅ 插件改动可以保留
- ✅ 未来的升级将无冲突

**建议**: 提交 Pull Request 到 NocoBase 官方仓库

---

## 🔧 开发建议

### 减少核心包改动 (可选)

如果您想完全避免修改核心包，可以考虑：

1. **使用 patch-package** (自动化)
   ```bash
   pnpm add -D patch-package
   pnpm patch-package nocobase-core
   ```

2. **创建自定义组件** (需要重构)
   - 在插件中实现独立的预览组件
   - 工作量较大，但完全独立

3. **后端方案** (复杂)
   - 在 URL 生成时直接附加 token
   - 需要访问请求上下文

---

## 📞 获取帮助

- 📖 详细升级指南: [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md)
- 🔧 WebDAV 开发文档: [WEBDAV_DEV_GUIDE.md](./WEBDAV_DEV_GUIDE.md)
- 🌐 NocoBase 官方文档: https://docs-cn.nocobase.com/

---

## ✨ 总结

**好消息**:
- ✅ 改动量小，集中在 6 个文件
- ✅ 90% 的改动在插件内，不会冲突
- ✅ 已提供 patch 文件和升级指南
- ✅ 功能向下兼容，不影响其他存储类型

**需要注意**:
- ⚠️ 升级时需要手动合并 `Upload.tsx` 的改动
- ⚠️ 大版本升级可能需要重新评估方案
- ⚠️ 建议提交 PR 到官方，争取被采纳

**总体评价**: 🟢 **低风险改动，易于维护**
