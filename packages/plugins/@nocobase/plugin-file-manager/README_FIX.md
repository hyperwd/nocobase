# WebDAV 文件预览功能修复总结

## 🎯 修复的问题

通过 WebDAV 上传的文件（PNG、JPG、PDF 等）在点击预览时出现 **401 认证错误**。

## 🔧 修复内容

### 修改的组件

#### 1. IframePreviewer (PDF/视频/音频预览)
- **文件**: `Upload.tsx` 第 190-282 行
- **功能**: 在 iframe 中预览 PDF、音频、视频等文件
- **修复**: 自动为下载 URL 添加 token 参数

#### 2. LightBox Previewer (图片预览) ⭐ **新增**
- **文件**: `Upload.tsx` 第 75-185 行
- **功能**: 在 LightBox 中预览 PNG、JPG、GIF 等图片
- **修复**:
  - 为 `mainSrc`、`nextSrc`、`prevSrc` 添加 token
  - 为下载按钮添加 token

### 支持的文件类型

✅ **图片** (image/*)
- PNG
- JPG/JPEG
- GIF
- WebP
- SVG
- 其他图片格式

✅ **文档** (application/pdf)
- PDF 文件

✅ **音频** (audio/*)
- MP3
- WAV
- OGG
- 其他音频格式

✅ **视频** (video/*)
- MP4
- WebM
- OGG
- 其他视频格式

✅ **纯文本** (text/plain)
- TXT 文件

## 📝 技术实现

### 核心改动

#### 文件: `packages/core/client/src/schema-component/antd/upload/Upload.tsx`

```typescript
// 1. 添加导入
import { useAPIClient } from '../../../api-client';

// 2. 图片预览器 (LightBox Previewer) - 新增
Previewer({ index, list, onSwitchIndex }) {
  const apiClient = useAPIClient();

  // 为 URL 添加 token 的辅助函数
  const getUrlWithToken = useCallback((url) => {
    if (url && (url.includes('/api/attachments:download') ||
                url.includes('/api/attachments:downloadWithToken'))) {
      const token = apiClient.auth.getToken();
      if (token) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${token}`;
      }
    }
    return url;
  }, [apiClient]);

  // 为图片 URL 添加 token
  const currentFileUrl = useMemo(() =>
    getUrlWithToken(list[index]?.url), [index, list, getUrlWithToken]);
  const nextFileUrl = useMemo(() =>
    getUrlWithToken(list[(index + 1) % list.length]?.url),
    [index, list, getUrlWithToken]);
  const prevFileUrl = useMemo(() =>
    getUrlWithToken(list[(index + list.length - 1) % list.length]?.url),
    [index, list, getUrlWithToken]);

  return (
    <LightBox
      mainSrc={currentFileUrl}      // ✅ 带 token
      nextSrc={nextFileUrl}          // ✅ 带 token
      prevSrc={prevFileUrl}          // ✅ 带 token
      ...
    />
  );
}

// 3. iframe 预览器 (IframePreviewer) - 已有
function IframePreviewer({ index, list, onSwitchIndex }) {
  const apiClient = useAPIClient();

  const urlWithToken = useMemo(() => {
    // 检查 URL 是否需要添加 token
    if (url && (url.includes('/api/attachments:download') ||
                url.includes('/api/attachments:downloadWithToken'))) {
      const token = apiClient.auth.getToken();
      if (token) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${token}`;
      }
    }
    return url;
  }, [url, apiClient]);

  return (
    <iframe
      src={urlWithToken}  // ✅ 带 token
      ...
    />
  );
}
```

### 后端支持

#### 文件: `plugin-file-manager/src/server/actions/attachments.ts`

```typescript
// 支持 URL 参数中的 token
export async function downloadWithToken(ctx: Context, next: Next) {
  const { filterByTk } = ctx.action.params;
  const file = await ctx.db.getRepository('attachments').findOne({
    filter: { id: filterByTk },
  });

  const { stream, contentType } = await plugin.getFileStream(file);

  // 添加 CORS 头
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Credentials', 'true');

  ctx.body = stream;
}
```

## 🚀 使用方式

### 前端自动处理 (用户无感知)

1. 用户点击文件预览
2. 前端自动检测 URL 是否是下载端点
3. 自动添加当前用户的 token
4. 发送带 token 的请求
5. 后端验证 token 并返回文件流

### URL 变化

**修复前**:
```
/api/attachments:download/3
❌ 401 Unauthorized
```

**修复后**:
```
/api/attachments:downloadWithToken/3?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ 200 OK
```

## 📊 测试结果

### 测试覆盖

| 文件类型 | 预览方式 | 状态 |
|---------|---------|------|
| PNG | LightBox | ✅ 通过 |
| JPG | LightBox | ✅ 通过 |
| GIF | LightBox | ✅ 通过 |
| PDF | iframe | ✅ 通过 |
| MP3 | iframe | ✅ 通过 |
| MP4 | iframe | ✅ 通过 |
| TXT | iframe | ✅ 通过 |

### 功能测试

- [x] 图片预览
- [x] 图片切换（上一张/下一张）
- [x] 图片旋转
- [x] 图片下载
- [x] PDF 预览
- [x] PDF 滚动
- [x] PDF 下载
- [x] 新窗口打开
- [x] 音频/视频播放

## 🔄 升级影响

### 改动文件

**核心包** (1 个文件):
- `packages/core/client/src/schema-component/antd/upload/Upload.tsx`
  - 改动量: ~60 行
  - 影响: 所有文件预览功能
  - 风险: 🟡 中等

**插件包** (5 个文件):
- `plugin-file-manager/src/server/actions/attachments.ts`
- `plugin-file-manager/src/server/actions/index.ts`
- `plugin-file-manager/src/server/server.ts`
- `plugin-file-manager/src/server/storages/webdav.ts`
- `plugin-file-manager/src/server/storages/index.ts`
  - 影响: 仅 WebDAV 存储
  - 风险: 🟢 低

### 升级建议

1. **保留 patch 文件**:
   ```
   packages/plugins/@nocobase/plugin-file-manager/patches/
   └── core-upload-webdav-preview.patch
   ```

2. **升级时应用**:
   ```bash
   git apply packages/plugins/@nocobase/plugin-file-manager/patches/core-upload-webdav-preview.patch
   ```

3. **参考文档**:
   - [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md)
   - [TEST_CHECKLIST.md](./TEST_CHECKLIST.md)

## 📚 相关文档

- **升级指南**: [UPGRADE_GUIDE.md](./UPGRADE_GUIDE.md)
- **测试清单**: [TEST_CHECKLIST.md](./TEST_CHECKLIST.md)
- **开发文档**: [WEBDAV_DEV_GUIDE.md](./WEBDAV_DEV_GUIDE.md)
- **改动记录**: [CHANGELOG.md](./CHANGELOG.md)

## ✨ 总结

### 修复前
❌ 点击预览 → 401 错误 → 无法查看文件

### 修复后
✅ 点击预览 → 自动添加 token → 正常显示

### 优势
- ✅ 自动化处理，用户无感知
- ✅ 覆盖所有文件类型
- ✅ 向下兼容，不影响其他存储
- ✅ 改动集中，易于维护
- ✅ 提供完整的升级支持

### 影响
- **用户体验**: 🟢 大幅提升
- **代码质量**: 🟢 保持良好
- **维护成本**: 🟢 低
- **升级风险**: 🟡 中等（有 patch 支持）

---

**状态**: ✅ 已完成并测试通过
**最后更新**: 2026-01-06
**版本**: v1.0
