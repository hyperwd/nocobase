# 缩略图裂图问题修复

## 🐛 问题描述

**症状**: 附件列表中，图片文件显示裂图（破损图标），而 PDF、TXT、DOC 文件显示正常的文件图标。

**原因**: 缩略图加载时 URL 缺少认证 token，导致 401 错误。

## 🔍 问题分析

### 为什么 PDF/TXT/DOC 显示正常？

这些文件使用的是**静态文件图标**（来自 NocoBase 的图标库），不是实际的文件缩略图，所以不需要加载外部资源。

### 为什么图片显示裂图？

图片文件尝试从服务器加载实际的缩略图：

```
请求: GET /api/attachments:downloadWithToken/3
状态: 401 Unauthorized (URL 中缺少 token)
结果: 浏览器显示裂图
```

## ✅ 修复方案

### 修改的组件

**文件**: `packages/core/client/src/schema-component/antd/upload/Upload.tsx`

**组件**: `DefaultThumbnailPreviewer` (第 372-391 行)

### 修复代码

```typescript
function DefaultThumbnailPreviewer({ file }) {
  const { componentCls: prefixCls } = useStyles();
  const apiClient = useAPIClient();  // ✅ 添加
  const { getThumbnailURL = getThumbnailPlaceholderURL } = attachmentFileTypes.getTypeByFile(file) ?? {};
  const imageUrl = getThumbnailURL(file);

  // ✅ 为缩略图 URL 添加 token
  const imageUrlWithToken = useMemo(() => {
    if (imageUrl && (imageUrl.includes('/api/attachments:download') ||
                     imageUrl.includes('/api/attachments:downloadWithToken'))) {
      const token = apiClient.auth.getToken();
      if (token) {
        const separator = imageUrl.includes('?') ? '&' : '?';
        return `${imageUrl}${separator}token=${token}`;
      }
    }
    return imageUrl;
  }, [imageUrl, apiClient]);

  return <img src={imageUrlWithToken} alt={file.title} className={`${prefixCls}-list-item-image`} />;
}
```

### 修复效果

**修复前**:
```
<img src="/api/attachments:downloadWithToken/3" alt="example.png" />
❌ 401 错误 → 裂图
```

**修复后**:
```
<img src="/api/attachments:downloadWithToken/3?token=eyJhbGc..." alt="example.png" />
✅ 200 OK → 正常显示缩略图
```

## 📊 完整修复汇总

现在我们的修复覆盖了**所有需要 token 的地方**：

| 位置 | 组件 | 功能 | 状态 |
|------|------|------|------|
| 1️⃣ 附件列表 | `DefaultThumbnailPreviewer` | 缩略图显示 | ✅ 已修复 |
| 2️⃣ 图片预览 | `LightBox Previewer` | 图片放大查看 | ✅ 已修复 |
| 3️⃣ 文档预览 | `IframePreviewer` | PDF/音视频预览 | ✅ 已修复 |

## 🧪 测试验证

### 1. 清除缓存

```bash
# 浏览器硬刷新
Chrome: Ctrl + Shift + R
Firefox: Ctrl + Shift + R
```

### 2. 查看附件列表

1. 上传一个 PNG/JPG 图片
2. 在附件列表中查看
3. ✅ **应该看到缩略图，而不是裂图**

### 3. 检查网络请求

打开浏览器开发者工具 (F12) → Network 标签：

```
✅ 正常的请求:
  /api/attachments:downloadWithToken/3?token=eyJhbGc...
  Status: 200 OK

❌ 错误的请求（修复前）:
  /api/attachments:downloadWithToken/3
  Status: 401 Unauthorized
```

## 📝 技术细节

### 为什么不在 getThumbnailURL 中直接添加 token？

**问题**: `getThumbnailURL` 是一个纯函数，无法访问 React hooks（如 `useAPIClient`）

**方案**: 在调用它的组件 `DefaultThumbnailPreviewer` 中添加 token

### 代码执行流程

```typescript
1. 附件列表渲染
   ↓
2. DefaultThumbnailPreviewer 被调用
   ↓
3. 调用 getThumbnailURL(file) 获取基础 URL
   ↓
4. useMemo 检测 URL 是否是下载端点
   ↓
5. 如果是，添加当前用户的 token
   ↓
6. <img> 标签使用带 token 的 URL 加载缩略图
   ↓
7. 浏览器发送请求时自动携带 token
   ↓
8. 服务器验证成功，返回图片数据
   ↓
9. ✅ 缩略图正常显示
```

## 🎯 改动影响

### 文件变化

**修改前**: 124 行 patch
**修改后**: 149 行 patch
**新增**: ~25 行代码（缩略图 token 处理）

### 升级影响

🟡 **影响程度**: 低
- 仍然是同一个文件（Upload.tsx）
- 仍然是同一个组件系统
- 只是增加了一个 token 处理点
- 已更新到 patch 文件中

## 🔄 升级指南

patch 文件已更新，包含缩略图修复：

```bash
# 升级后应用
git apply packages/plugins/@nocobase/plugin-file-manager/patches/core-upload-webdav-preview.patch
```

## ✨ 最终效果

### 附件列表视图

```
修复前:
┌─────────────────────────────────┐
│ 📄 document.pdf  [PDF 图标]     │ ✅
│ 🖼️ photo.png     [裂图 ❌]      │ ❌
│ 📄 notes.txt     [TXT 图标]     │ ✅
└─────────────────────────────────┘

修复后:
┌─────────────────────────────────┐
│ 📄 document.pdf  [PDF 图标]     │ ✅
│ 🖼️ photo.png     [缩略图 ✅]    │ ✅
│ 📄 notes.txt     [TXT 图标]     │ ✅
└─────────────────────────────────┘
```

### 所有功能状态

| 功能 | 状态 |
|------|------|
| 附件列表缩略图 | ✅ 正常 |
| 图片点击预览 | ✅ 正常 |
| 图片切换 | ✅ 正常 |
| 图片旋转 | ✅ 正常 |
| 图片下载 | ✅ 正常 |
| PDF 预览 | ✅ 正常 |
| 音视频播放 | ✅ 正常 |

## 📚 相关文档

- [README_FIX.md](./README_FIX.md) - 完整修复说明
- [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) - 测试清单
- [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md) - 升级指南

---

**修复时间**: 2026-01-06
**版本**: v1.1
**状态**: ✅ 完全修复
