/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { SchemaExpressionScopeContext, useField, useFieldSchema, useForm } from '@formily/react';
import {
  SchemaInitializerItemType,
  useActionContext,
  useBlockRequestContext,
  useCollectionManager_deprecated,
  useCollection_deprecated,
  useCompile,
  useNavigateNoUpdate,
  useRemoveGridFormItem,
  useTableBlockContext,
  useTableSelectorContext,
} from '@nocobase/client';
import { isURL } from '@nocobase/utils/client';
import { App, message } from 'antd';
import { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 批量编辑表单值类型枚举
 * 对应 BulkEditFormItemValueType
 */
enum BulkEditValueType {
  RemainsTheSame = 1,
  ChangedTo = 2,
  Clear = 3,
  AddAttach = 4,
}

/**
 * 解析批量编辑的表单值
 * 将批量编辑的特殊数据结构 { 1: value, 2: null, 3: undefined } 转换为实际的值
 *
 * @param formValues - 表单值对象
 * @returns 解析后的值对象（只包含需要更新的字段）
 */
function parseBulkEditValues(formValues: Record<string, any>): Record<string, any> {
  const parsedValues: Record<string, any> = {};

  for (const key in formValues) {
    const value = formValues[key];

    // 跳过 undefined 和 null
    if (value === undefined || value === null) {
      continue;
    }

    // 检查是否是批量编辑的数据结构（对象但不是数组）
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (BulkEditValueType.ChangedTo in value) {
        // 更改为：提取实际值
        const actualValue = value[BulkEditValueType.ChangedTo];
        if (actualValue !== undefined) {
          parsedValues[key] = actualValue;
        }
      } else if (BulkEditValueType.Clear in value) {
        // 清空：设置为 null
        parsedValues[key] = null;
      } else if (BulkEditValueType.AddAttach in value) {
        // 添加附件：提取实际值
        const actualValue = value[BulkEditValueType.AddAttach];
        if (actualValue !== undefined) {
          parsedValues[key] = actualValue;
        }
      } else if (BulkEditValueType.RemainsTheSame in value) {
        // 保持不变：不包含在结果中
        continue;
      } else {
        // 普通对象，保持原样
        parsedValues[key] = value;
      }
    } else {
      // 普通值或数组（如附件字段），保持原样
      parsedValues[key] = value;
    }
  }

  return parsedValues;
}

export const useCustomBulkEditFormItemInitializerFields = (options?: any) => {
  const { name, fields } = useCollection_deprecated();
  const { getInterface, getCollection } = useCollectionManager_deprecated();
  const form = useForm();
  const { readPretty = form.readPretty, block = 'Form' } = options || {};
  const remove = useRemoveGridFormItem();
  const filterFields = useMemo(
    () =>
      fields
        ?.filter((field) => {
          return (
            field?.interface &&
            !field?.uiSchema?.['x-read-pretty'] &&
            field.interface !== 'snapshot' &&
            field.type !== 'sequence'
          );
        })
        .map((field) => {
          const interfaceConfig = getInterface(field.interface);
          const schema = {
            type: 'string',
            name: field.name,
            title: field?.uiSchema?.title || field.name,
            'x-toolbar': 'FormItemSchemaToolbar',
            'x-settings': 'fieldSettings:BulkEditFormItem',
            'x-component': 'BulkEditField',
            'x-decorator': 'FormItem',
            'x-collection-field': `${name}.${field.name}`,
          };
          return {
            name: field?.uiSchema?.title || field.name,
            type: 'item',
            title: field?.uiSchema?.title || field.name,
            Component: 'CollectionFieldInitializer',
            remove: remove,
            schemaInitialize: (s) => {
              interfaceConfig?.schemaInitialize?.(s, {
                field,
                block,
                readPretty,
                targetCollection: getCollection(field.target),
              });
            },
            schema,
          } as SchemaInitializerItemType;
        }),
    [fields],
  );

  return filterFields;
};

export const useCustomizeBulkEditActionProps = () => {
  const form = useForm();
  const { t } = useTranslation();
  const { field, resource, __parent } = useBlockRequestContext();
  const expressionScope = useContext(SchemaExpressionScopeContext);
  const actionContext = useActionContext();
  const navigate = useNavigateNoUpdate();
  const compile = useCompile();
  const actionField = useField();
  const tableBlockContext = useTableBlockContext();
  const tableSelectorContext = useTableSelectorContext();
  const { modal } = App.useApp();
  const selectedRecordKeys =
    tableBlockContext.field?.data?.selectedRowKeys ??
    expressionScope?.selectedRecordKeys ??
    tableSelectorContext.field?.data?.selectedRowKeys ??
    [];
  const { setVisible, fieldSchema: actionSchema, setSubmitted } = actionContext;
  const fieldSchema = useFieldSchema();
  return {
    async onClick() {
      const { updateMode } = actionSchema?.['x-action-settings'] ?? {};
      const { onSuccess, skipValidator, triggerWorkflows } = fieldSchema?.['x-action-settings'] ?? {};
      const { refreshDataBlockRequest } = fieldSchema?.['x-component-props'] ?? {};
      const { manualClose, redirecting, redirectTo, successMessage, actionAfterSuccess } = onSuccess || {};
      const { filter } = __parent.service.params?.[0] ?? {};

      if (!skipValidator) {
        await form.submit();
      }

      actionField.data = field.data || {};
      actionField.data.loading = true;
      try {
        const parsedValues = parseBulkEditValues(form.values);

        const updateData: {
          filter?: any;
          filterByTk?: any[];
          values: any;
          forceUpdate: boolean;
          triggerWorkflows?: string;
        } = {
          values: parsedValues,
          forceUpdate: false,
          triggerWorkflows: triggerWorkflows?.length
            ? triggerWorkflows.map((row) => [row.workflowKey, row.context].filter(Boolean).join('!')).join(',')
            : undefined,
        };

        if (updateMode === 'selected') {
          if (!selectedRecordKeys?.length) {
            message.error(t('Please select the records to be updated'));
            return;
          }
          updateData.filterByTk = selectedRecordKeys;
        } else {
          updateData.filter = filter;
        }

        if (!updateData.filter && !updateData.filterByTk) {
          updateData.forceUpdate = true;
        }

        await resource.update(updateData);
        actionField.data.loading = false;

        if (actionAfterSuccess === 'previous' || (!actionAfterSuccess && redirecting !== true)) {
          setVisible?.(false);
        }
        if (refreshDataBlockRequest !== false) {
          setSubmitted(true);
        }
        if (!successMessage) {
          if (((redirecting && !actionAfterSuccess) || actionAfterSuccess === 'redirect') && redirectTo) {
            if (isURL(redirectTo)) {
              window.location.href = redirectTo;
            } else {
              navigate(redirectTo);
            }
          }
          return;
        }
        if (manualClose) {
          modal.success({
            title: compile(successMessage),
            onOk: async () => {
              await form.reset();
              if (((redirecting && !actionAfterSuccess) || actionAfterSuccess === 'redirect') && redirectTo) {
                if (isURL(redirectTo)) {
                  window.location.href = redirectTo;
                } else {
                  navigate(redirectTo);
                }
              }
            },
          });
        } else {
          message.success(compile(successMessage));
        }
      } finally {
        actionField.data.loading = false;
      }
    },
  };
};
