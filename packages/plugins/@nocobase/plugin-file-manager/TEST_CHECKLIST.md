# WebDAV 文件预览功能测试清单

## 修复内容

已修复 **图片预览器 (LightBox)** 的 token 传递问题，现在支持：
- ✅ PDF 文件预览 (iframe)
- ✅ PNG/JPG/ GIF 等图片预览 (LightBox)
- ✅ 下一张/上一张切换
- ✅ 图片下载功能

## 测试步骤

### 1. 重启服务

```bash
# 如果服务正在运行，先停止 (Ctrl+C)
# 然后重新启动
yarn dev
# 或
pnpm dev
```

### 2. 测试图片预览

#### 测试用例 1: PNG 图片
1. 通过 WebDAV 上传一个 PNG 图片
2. 点击图片进行预览
3. ✅ 应该能在 LightBox 中正常显示
4. ✅ 点击左右箭头切换图片（如果有多张）
5. ✅ 点击下载按钮，能正常下载

#### 测试用例 2: JPG 图片
1. 通过 WebDAV 上传一个 JPG 图片
2. 点击图片进行预览
3. ✅ 应该能在 LightBox 中正常显示

#### 测试用例 3: GIF 图片
1. 通过 WebDAV 上传一个 GIF 图片
2. 点击图片进行预览
3. ✅ 应该能在 LightBox 中正常显示

### 3. 测试 PDF 预览

#### 测试用例 4: PDF 文件
1. 通过 WebDAV 上传一个 PDF 文件
2. 点击文件进行预览
3. ✅ 应该能在 iframe 中正常显示
4. ✅ 可以滚动浏览 PDF 内容
5. ✅ 点击"在新窗口打开"按钮
6. ✅ 点击"下载"按钮

### 4. 检查日志

#### 正常情况 (应该看到)
```
[Attachment Download With Token] Starting download for file: {
  id: 3,
  filename: "example.png",
  hasToken: true
}
[Attachment Download With Token] File stream obtained: {
  contentType: "image/png",
  filename: "example.png"
}
```

#### 不应该看到
```
❌ Unauthenticated. Please sign in to continue.
❌ code: 'EMPTY_TOKEN'
```

### 5. 测试其他存储类型

确保修复不影响其他存储：

#### 本地存储
1. 切换到本地存储
2. 上传图片
3. ✅ 预览功能正常

#### S3 / Aliyun OSS (如果配置了)
1. 切换到云存储
2. 上传图片
3. ✅ 预览功能正常

## 常见问题排查

### 问题 1: 仍然出现 401 错误

**原因**: 浏览器缓存了旧代码

**解决方法**:
```bash
# 1. 清除浏览器缓存
# Chrome: Ctrl+Shift+Delete
# Firefox: Ctrl+Shift+Delete

# 2. 或者使用无痕模式测试

# 3. 硬刷新页面
# Chrome: Ctrl+Shift+R
# Firefox: Ctrl+Shift+R
```

### 问题 2: 图片显示破损图标

**检查点**:
1. 打开浏览器开发者工具 (F12)
2. 查看 Network 标签
3. 找到图片请求
4. 检查 URL 是否包含 `?token=xxx`
5. 如果没有，说明前端代码未更新

**解决方法**:
```bash
# 重新构建前端
cd /root/nocobase
pnpm build --filter @nocobase/app-client
```

### 问题 3: PDF 无法预览

**检查点**:
1. URL 是否是 `/api/attachments:downloadWithToken/xxx`
2. 是否包含 `?token=xxx` 参数
3. 检查 Console 是否有错误

## 验证成功的标志

✅ **所有测试用例通过**
✅ **日志中没有 401 错误**
✅ **URL 中包含 token 参数**
✅ **其他存储类型不受影响**

## 回归测试清单

- [ ] WebDAV PNG 图片预览
- [ ] WebDAV JPG 图片预览
- [ ] WebDAV GIF 图片预览
- [ ] WebDAV PDF 文件预览
- [ ] WebDAV 音频文件预览
- [ ] WebDAV 视频文件预览
- [ ] 本地存储图片预览
- [ ] S3/OSS 存储预览（如果配置）
- [ ] 图片旋转功能
- [ ] 图片下载功能
- [ ] 下一张/上一张切换

## 性能检查

- [ ] 图片加载速度正常
- [ ] 切换图片流畅
- [ ] 没有内存泄漏
- [ ] 没有控制台错误

## 完成后

如果所有测试通过，功能就完全修复了！ 🎉

如果遇到问题，请提供以下信息：
1. 浏览器控制台错误
2. 服务器日志
3. 网络请求详情
