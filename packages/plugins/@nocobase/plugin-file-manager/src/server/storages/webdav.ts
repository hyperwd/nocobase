/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 *
 * WebDAV Storage Server Implementation
 * Added: 2025-01-04
 */

import axios, { AxiosInstance } from 'axios';
import path from 'path';
import { Readable } from 'stream';
import { AttachmentModel, StorageType } from '.';
import { FILE_SIZE_LIMIT_DEFAULT, STORAGE_TYPE_WEBDAV } from '../../constants';

const DEFAULT_BASE_URL = '/webdav';

export default class extends StorageType {
  static defaults() {
    return {
      title: 'WebDAV',
      type: STORAGE_TYPE_WEBDAV,
      name: 'webdav',
      baseUrl: DEFAULT_BASE_URL,
      options: {
        url: '',
        username: '',
        password: '',
        path: '/',
      },
      path: '',
      rules: {
        size: FILE_SIZE_LIMIT_DEFAULT,
      },
    };
  }

  static filenameKey = 'key';

  private getClient(): AxiosInstance {
    const { url, username, password } = this.storage.options;
    if (!url) {
      throw new Error('WebDAV URL is required');
    }

    // Ensure URL ends with / for proper axios path joining
    const baseUrl = url.endsWith('/') ? url : `${url}/`;

    return axios.create({
      baseURL: baseUrl,
      timeout: 600000, // 10 minutes timeout
      auth: {
        username,
        password,
      },
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  make() {
    const storage = this;
    const client = this.getClient();

    return {
      _handleFile: async function (req, file, cb) {
        try {
          // Generate unique filename
          const originalname = Buffer.from(file.originalname, 'binary').toString('utf8');
          const extname = path.extname(originalname);
          const basename = path.basename(originalname, extname).replace(/[<>?*|:"\\/]/g, '-');
          const filename = `${basename}-${Date.now()}${Math.random().toString(36).substring(2, 8)}${extname}`;

          // Build WebDAV path
          const storagePath = storage.storage.path || '';
          const webdavBasePath = storage.storage.options.path || '/';
          const webdavPath = path.join(webdavBasePath, storagePath, filename).split('/').filter(Boolean).join('/');

          // Upload to WebDAV using PUT
          // Check if file has buffer (memory storage) or stream (disk storage)
          if (file.buffer) {
            // Use buffer if available
            await client.put(webdavPath, file.buffer, {
              headers: {
                'Content-Type': file.mimetype || 'application/octet-stream',
              },
            });
          } else if (file.stream) {
            // Use stream if buffer not available
            const chunks: Buffer[] = [];
            for await (const chunk of file.stream) {
              chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            await client.put(webdavPath, buffer, {
              headers: {
                'Content-Type': file.mimetype || 'application/octet-stream',
              },
            });
          } else {
            throw new Error('File has neither buffer nor stream');
          }

          cb(null, {
            filename,
            key: filename, // Add 'key' field to match filenameKey='key'
            path: path.join(webdavBasePath, storagePath).replace(/^\//, '') || '',
            size: file.size,
            mimetype: file.mimetype,
          });
        } catch (error) {
          console.error('[WebDAV Upload] Upload failed:', error);
          cb(error);
        }
      },
      _removeFile: async function (req, file, cb) {
        // Deletion is handled by the delete() method
        cb(null);
      },
    };
  }

  async delete(records: AttachmentModel[]): Promise<[number, AttachmentModel[]]> {
    const client = this.getClient();
    let count = 0;
    const undeleted: AttachmentModel[] = [];
    const webdavBasePath = this.storage.options.path || '/';

    for (const record of records) {
      try {
        const filePath = record.path || '';
        const filename = record.filename;
        const webdavPath = path.join(webdavBasePath, filePath, filename).split('/').filter(Boolean).join('/');

        // Delete using WebDAV DELETE method
        await client.delete(webdavPath);
        count += 1;
      } catch (ex) {
        console.error('[WebDAV Delete] Failed to delete file:', ex.message);
        undeleted.push(record);
      }
    }

    return [count, undeleted];
  }

  async getFileStream(file: AttachmentModel): Promise<{ stream: Readable; contentType?: string }> {
    try {
      const client = this.getClient();
      const { url, path: webdavBasePath } = this.storage.options;
      const filePath = file.path || '';
      const filename = file.filename;

      // 构建完整路径
      const webdavPath = path
        .join(webdavBasePath || '/', filePath, filename)
        .split('/')
        .filter(Boolean)
        .join('/');

      // 对路径进行 URL 编码，但保持路径分隔符不被编码
      // 使用 encodeURI 不会编码 / 等保留字符
      const encodedPath = encodeURI(webdavPath).replace(/#/g, '%23'); // 特别处理 # 号

      // Get file from WebDAV
      const response = await client.get(encodedPath, {
        responseType: 'stream',
      });

      return {
        stream: response.data,
        contentType: response.headers['content-type'] || file.mimetype,
      };
    } catch (err) {
      console.error('[WebDAV GetStream] Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          baseURL: err.config?.baseURL,
        },
      });
      throw new Error(`Failed to get WebDAV file stream: ${err.message}`);
    }
  }

  getFileURL(file: AttachmentModel, preview = false): string {
    // 返回 NocoBase API 路径,通过 resourcer action 处理文件下载
    // 使用 downloadWithToken 端点,支持通过 URL 参数传递 token
    // 前端需要在 URL 中附加当前用户的 token: ?token=xxx
    const apiBase = process.env.API_BASE_PATH || '/api/';
    return `${apiBase}attachments:downloadWithToken/${file.id}`;
  }
}
