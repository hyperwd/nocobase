# WebDAV 文件预览功能 - 升级合并指南

## 功能说明

此修改解决了通过 WebDAV 上传的 PDF 等文件在点击预览时出现 401 认证错误的问题。

## 改动文件清单

### 🔴 核心包改动 (需要手动合并)

**文件**: `packages/core/client/src/schema-component/antd/upload/Upload.tsx`

**改动说明**: 在 `IframePreviewer` 组件中自动为 NocoBase API 下载 URL 添加 token 参数

**关键代码**:
```typescript
// 1. 添加导入
import { useAPIClient } from '../../../api-client';

// 2. 在 IframePreviewer 组件中添加
const apiClient = useAPIClient();
const urlWithToken = useMemo(() => {
  if (url && (url.includes('/api/attachments:download') || url.includes('/api/attachments:downloadWithToken'))) {
    const token = apiClient.auth.getToken();
    if (token) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${token}`;
    }
  }
  return url;
}, [url, apiClient]);
```

**升级时处理方式**:
1. 升级 NocoBase 到新版本
2. 检查 `Upload.tsx` 中的 `IframePreviewer` 组件是否有变化
3. 如果有冲突，手动合并此改动

### 🟢 插件包改动 (无需特殊处理)

以下文件位于 `plugin-file-manager` 插件内，升级时通常不会冲突：

1. `src/server/actions/attachments.ts` - 新增 `downloadWithToken` action
2. `src/server/actions/index.ts` - 注册新 action
3. `src/server/server.ts` - ACL 配置
4. `src/server/storages/webdav.ts` - WebDAV URL 生成逻辑

## 升级步骤

### 方式一: 手动合并 (推荐)

```bash
# 1. 备份当前改动
git diff packages/core/client/src/schema-component/antd/upload/Upload.tsx > /tmp/webdav-upload.patch

# 2. 升级 NocoBase
git checkout main
git pull origin main
# 或切换到新版本 tag

# 3. 应用核心包改动
git apply /tmp/webdav-upload.patch

# 4. 如果有冲突，手动解决
# 打开 Upload.tsx，找到 IframePreviewer 组件
# 按照上面的"关键代码"添加 token 处理逻辑

# 5. 重新构建
yarn build
# 或
pnpm build
```

### 方式二: 使用 patch-package (自动化)

```bash
# 1. 安装 patch-package
pnpm add -D patch-package

# 2. 创建 patch 文件
pnpm patch-package nocobase-core

# 3. 在 package.json 中添加 postinstall 脚本
{
  "scripts": {
    "postinstall": "patch-package"
  }
}

# 4. 将生成的 patch 文件提交到代码仓库
git add patches/
git commit -m "chore: add patch for WebDAV file preview"

# 5. 每次升级后自动应用 patch
pnpm install  # 会自动运行 patch-package
```

### 方式三: 完全避免修改核心包 (需要重构)

如果不想修改核心包，可以考虑以下方案，但需要更多开发工作：

1. **创建自定义预览组件**
   - 在插件中实现自己的文件预览组件
   - 专门处理 WebDAV 文件的 token 逻辑
   - 工作量较大，需要重新实现预览功能

2. **后端生成带 token 的 URL**
   - 修改 WebDAV 存储的 `getFileURL` 方法
   - 在服务端直接生成带 token 的 URL
   - 需要在请求上下文中获取当前 token，比较复杂

## 验证升级结果

升级后请测试以下功能：

1. ✅ 通过 WebDAV 上传 PDF 文件
2. ✅ 点击文件进行预览，能在 iframe 中正常显示
3. ✅ 不再出现 401 认证错误
4. ✅ 其他存储类型（本地、S3、Aliyun OSS）的预览功能正常

## 冲突解决示例

如果 `Upload.tsx` 在新版本中有变化，可能会出现如下冲突：

```typescript
function IframePreviewer({ index, list, onSwitchIndex }) {
  const { t } = useTranslation();
+ const apiClient = useAPIClient();  // 我们的改动
  const file = list[index];
  const url = file.url;

+ // 我们的改动: urlWithToken 逻辑
+ const urlWithToken = useMemo(() => { ... }, [url, apiClient]);

  // 新版本可能添加了其他功能
+ const someNewFeature = useMemo(() => { ... }, [url]);

  return (
    <Modal>
      <iframe
-       src={url}  // 原始代码
+       src={urlWithToken}  // 我们的改动
      />
    </Modal>
  );
}
```

**解决方法**: 保留我们的改动，同时合并新版本的其他功能。

## 联系与支持

如有问题，请参考：
- WebDAV 开发文档: `WEBDAV_DEV_GUIDE.md`
- NocoBase 官方文档: https://docs-cn.nocobase.com/
