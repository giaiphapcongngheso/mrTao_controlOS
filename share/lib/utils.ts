import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { IBaseParams } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPortalContainer() {
  if (typeof document === 'undefined') return undefined;
  return document.getElementById('app-scale') ?? document.body;
}

export function emptyToUndefined(str?: string | null): string | undefined {
  return str && str.trim() !== '' ? str : undefined;
}

export function getFullName(
  firstName?: string | null,
  lastName?: string | null,
): string | undefined {
  if (!firstName && !lastName) return '';
  return [lastName, firstName]?.join(' ');
}

export function removeVietnameseTones(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function hexToRgba(hex?: string, alpha?: number) {
  if (!hex) return '';
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.substring(0, 2), 16);
  const g = Number.parseInt(h.substring(2, 4), 16);
  const b = Number.parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha ?? 1})`;
}

export function formatIntegerPart(value?: string | number): string {
  if (value === undefined || value === null) return '';

  const str = value.toString();
  const [integerPart, decimalPart] = str.includes('.') ? str.split('.') : str.split(',');

  const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return decimalPart !== undefined ? `${formattedInt},${decimalPart}` : formattedInt;
}

export function parseCurrencyToNumber(value?: string): number | undefined {
  if (!value) return undefined;

  const newValue = value.replace(/\./g, '');
  const normalized = newValue.replace(',', '.');
  const result = parseFloat(normalized);

  return isNaN(result) ? undefined : result;
}

export function secondsToHHMMSS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

type BuildApiParamsType<T> = {
  queryObj: T; //object queryParam
  listKeysSearch?: (keyof T)[]; //Các key cần filter search (simple AND)
  searchGroups?: {
    operator: 'AND' | 'OR';
    keys: (keyof T)[];
  }[]; // Nhóm search với operator riêng
  listKeysFilter?: (keyof T)[]; //Các key cần filter select (simple AND)
  filterGroups?: {
    operator: 'AND' | 'OR';
    keys?: (keyof T)[];
    conditions?: {
      key: keyof T;
      value: string | number;
      operator?: string;
    }[];
  }[]; // Nhóm filter với operator riêng
  listDeepFilter?: Record<string, keyof T>[]; //Các key cần filter deep (==, AND)
  /** Deep filter OR: cùng một param map tới nhiều API key, dùng @= (contains) và nối OR. Dùng cho tìm theo mã hoặc tên. */
  listDeepFilterOr?: Record<string, keyof T>[]; // [{ 'FinishedGoodCode': 'searchCondition' }, { 'FinishedGoodName': 'searchCondition' }]
  globalKeysSearch?: {
    key: string;
    keySearch: string;
  }[]; //Các key cần filter global search
  compares?: {
    key: string;
    listKeysCompare: { key: keyof T; operator: string }[];
  }[]; // Các key cần so sánh
  includes?: string[]; // Các key cần lấy object
};

// Chuyển đổi query param về dạng param với type IPagedParams
export function buildApiParams<
  T extends Omit<IBaseParams, 'page' | 'pageSize'> & { searchCondition?: string },
>({
  queryObj,
  listKeysSearch,
  listKeysFilter,
  searchGroups,
  filterGroups,
  listDeepFilter,
  listDeepFilterOr,
  compares,
  includes,
  globalKeysSearch,
}: BuildApiParamsType<T>) {
  // const { sortBy, sortOrder, ...rest } = queryObj;

  // 🧭 1️⃣ Build sort string
  let sorts = undefined;
  if (queryObj?.sortBy) {
    sorts = queryObj?.sortOrder === 'desc' ? `-${queryObj?.sortBy}` : `${queryObj?.sortBy}`;
  }

  // Loại bỏ 2 key sortBy/sortOrder khỏi T để type index không lỗi
  type CleanKeys = Exclude<keyof T, 'sortBy' | 'sortOrder'>;
  const r = queryObj as Pick<T, CleanKeys>;

  // 🧮 2️⃣ Build filters
  const filters: string[] = [];

  // Search keys đơn giản (AND, giữ nguyên behaviour cũ)
  if (listKeysSearch && listKeysSearch.length > 0) {
    for (const key of listKeysSearch) {
      const value = r[key as CleanKeys];

      if (value !== undefined && value !== null && value !== '') {
        filters.push(`${String(key)}@=${value}`);
      }
    }
  }

  // Search groups (hỗ trợ AND/OR trong từng group)
  if (searchGroups && searchGroups.length > 0) {
    for (const group of searchGroups) {
      const conditions: string[] = [];
      for (const key of group.keys) {
        const value = r[key as CleanKeys];
        if (value !== undefined && value !== null && value !== '') {
          conditions.push(`${String(key)}@=${value}`);
        }
      }
      if (conditions.length > 0) {
        if (group.operator === 'OR') {
          filters.push(`(${conditions.join(' || ')})`);
        } else {
          // AND: mỗi điều kiện là một filter riêng, giữ cho group rõ ràng
          filters.push(...conditions);
        }
      }
    }
  }

  // Filter keys đơn giản (AND, giữ nguyên behaviour cũ)
  if (listKeysFilter && listKeysFilter.length > 0) {
    for (const key of listKeysFilter) {
      const value = r[key as CleanKeys];
      if (value !== undefined && value !== null && value !== '') {
        filters.push(`${String(key)}==${value}`);
      }
    }
  }

  // Filter groups (hỗ trợ AND/OR trong từng group)
  if (filterGroups && filterGroups.length > 0) {
    for (const group of filterGroups) {
      const conditions: string[] = [];
      // Handle keys-based filter
      if (group.keys) {
        for (const key of group.keys) {
          const value = r[key as CleanKeys];
          if (value !== undefined && value !== null && value !== '') {
            conditions.push(`${String(key)}==${value}`);
          }
        }
      }
      // Handle conditions-based filter
      if (group.conditions) {
        for (const cond of group.conditions) {
          const operator = cond.operator || '==';
          conditions.push(`${String(cond.key)}${operator}${cond.value}`);
        }
      }
      if (conditions.length > 0) {
        if (group.operator === 'OR') {
          filters.push(`(${conditions.join(' || ')})`);
        } else {
          filters.push(...conditions);
        }
      }
    }
  }

  // Deep Filter keys (dùng ==)
  if (listDeepFilter) {
    for (const item of listDeepFilter) {
      for (const [key, sourceKey] of Object.entries(item)) {
        const value = r[sourceKey as CleanKeys];
        if (value !== undefined && value !== null && value !== '') {
          filters.push(`${key}==${value}`);
        }
      }
    }
  }

  // Deep Filter OR (cùng param → nhiều API key, dùng @= và nối OR)
  if (listDeepFilterOr && listDeepFilterOr.length > 0) {
    const byParam = new Map<CleanKeys, string[]>();
    for (const item of listDeepFilterOr) {
      for (const [apiKey, paramKey] of Object.entries(item)) {
        const value = r[paramKey as CleanKeys];
        if (value !== undefined && value !== null && value !== '') {
          const arr = byParam.get(paramKey as CleanKeys) ?? [];
          arr.push(apiKey);
          byParam.set(paramKey as CleanKeys, arr);
        }
      }
    }
    for (const [paramKey, apiKeys] of byParam) {
      const value = r[paramKey];
      if (apiKeys.length > 1) {
        filters.push(`(${apiKeys.map((k) => `${k}@=${value}`).join('||')})`);
      } else if (apiKeys.length === 1) {
        filters.push(`${apiKeys[0]}@=${value}`);
      }
    }
  }

  // Compare keys (dùng operator)
  if (compares) {
    for (const group of compares) {
      for (const { key, operator } of group.listKeysCompare) {
        const value = r[key as CleanKeys];
        if (value !== undefined && value !== null && value !== '') {
          filters.push(`${group.key}${operator}${value}`);
        }
      }
    }
  }

  // 🔍 3️⃣ Global search (dùng OR logic với mapping key)
  if (globalKeysSearch && globalKeysSearch.length > 0 && r.searchCondition) {
    const searchValue = r.searchCondition as string;
    if (searchValue !== undefined && searchValue !== null && searchValue !== '') {
      // Loại bỏ các key đã được sử dụng trong listKeysSearch/listKeysFilter
      const usedKeys = new Set([
        ...(listKeysSearch?.map((k) => String(k)) || []),
        ...(listKeysFilter?.map((k) => String(k)) || []),
      ]);

      const uniqueGlobalKeys = globalKeysSearch.filter((item) => !usedKeys.has(String(item.key)));

      if (uniqueGlobalKeys.length > 0) {
        const globalSearchConditions = uniqueGlobalKeys
          .map((item) => `${item.keySearch}@=${searchValue}`)
          .join(' || ');

        filters.push(`(${globalSearchConditions})`);
      }
    }
  }
  return {
    // page: queryObj?.page,
    // pageSize: queryObj.pageSize,
    sorts,
    filters: filters.join('&&'),
    includes: includes?.join(','),
  };
}

export function getUnitOfMeasureDisplay(
  uom?: { symbol?: string | null; name?: string | null; code?: string | null } | null,
): string {
  if (!uom) return '';
  return uom.symbol || uom.name || uom.code || '';
}
