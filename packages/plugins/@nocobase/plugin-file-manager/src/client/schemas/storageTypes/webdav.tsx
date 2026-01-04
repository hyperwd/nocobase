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
 * WebDAV Storage Type Implementation
 * Added: 2025-01-04
 */

import { NAMESPACE } from '../../locale';
import common from './common';

export default {
  title: `{{t("WebDAV", { ns: "${NAMESPACE}" })}}`,
  name: 'webdav',
  fieldset: {
    title: common.title,
    name: common.name,
    baseUrl: common.baseUrl,
    options: {
      type: 'object',
      'x-component': 'fieldset',
      properties: {
        url: {
          title: `{{t("WebDAV URL", { ns: "${NAMESPACE}" })}}`,
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'TextAreaWithGlobalScope',
          description: `{{t('WebDAV server URL. For example: "https://cloud.example.com/remote.php/webdav".', { ns: "${NAMESPACE}" })}}`,
          required: true,
        },
        username: {
          title: `{{t("Username", { ns: "${NAMESPACE}" })}}`,
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'TextAreaWithGlobalScope',
          required: true,
        },
        password: {
          title: `{{t("Password", { ns: "${NAMESPACE}" })}}`,
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'TextAreaWithGlobalScope',
          'x-component-props': { password: true },
          required: true,
        },
        path: {
          title: `{{t("WebDAV Path", { ns: "${NAMESPACE}" })}}`,
          type: 'string',
          'x-decorator': 'FormItem',
          'x-component': 'TextAreaWithGlobalScope',
          description: `{{t('Base path on WebDAV server. Default is "/".', { ns: "${NAMESPACE}" })}}`,
          default: '/',
        },
      },
    },
    path: common.path,
    rules: common.rules,
    default: common.default,
    paranoid: common.paranoid,
  },
};
