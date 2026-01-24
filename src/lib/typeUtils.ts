/**
 * 타입 변환 유틸리티
 * snake_case (DB) <-> camelCase (Frontend) 변환
 */

// snake_case를 camelCase로 변환하는 타입
type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S;

// 객체의 모든 키를 camelCase로 변환하는 타입
type CamelCaseKeys<T> = {
  [K in keyof T as K extends string ? SnakeToCamelCase<K> : K]: T[K] extends object
    ? T[K] extends Array<infer U>
      ? U extends object
        ? Array<CamelCaseKeys<U>>
        : T[K]
      : CamelCaseKeys<T[K]>
    : T[K];
};

// camelCase를 snake_case로 변환하는 타입 (향후 사용 예정)
type _CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? T extends Uppercase<T>
    ? `_${Lowercase<T>}${_CamelToSnakeCase<U>}`
    : `${T}${_CamelToSnakeCase<U>}`
  : S;

/**
 * snake_case 문자열을 camelCase로 변환
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * camelCase 문자열을 snake_case로 변환
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * 객체의 모든 키를 snake_case에서 camelCase로 변환
 */
export function keysToCamel<T extends Record<string, unknown>>(obj: T): CamelCaseKeys<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj as CamelCaseKeys<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null
        ? keysToCamel(item as Record<string, unknown>)
        : item
    ) as CamelCaseKeys<T>;
  }

  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      const value = obj[key];
      result[camelKey] =
        typeof value === 'object' && value !== null
          ? keysToCamel(value as Record<string, unknown>)
          : value;
    }
  }
  return result as CamelCaseKeys<T>;
}

/**
 * 객체의 모든 키를 camelCase에서 snake_case로 변환
 */
export function keysToSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown>;
export function keysToSnake<T>(obj: T[]): unknown[];
export function keysToSnake<T>(obj: T | T[]): Record<string, unknown> | unknown[] {
  if (obj === null || typeof obj !== 'object') {
    return obj as Record<string, unknown>;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null
        ? keysToSnake(item as Record<string, unknown>)
        : item
    );
  }

  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      const value = obj[key];
      result[snakeKey] =
        typeof value === 'object' && value !== null
          ? keysToSnake(value as Record<string, unknown>)
          : value;
    }
  }
  return result;
}

/**
 * 배열의 모든 객체 키를 camelCase로 변환
 */
export function arrayKeysToCamel<T extends Record<string, unknown>>(
  arr: T[]
): CamelCaseKeys<T>[] {
  return arr.map((item) => keysToCamel(item));
}

/**
 * Supabase 응답을 프론트엔드 타입으로 변환하는 래퍼
 */
export function transformResponse<T extends Record<string, unknown>>(
  data: T | null
): CamelCaseKeys<T> | null {
  if (data === null) return null;
  return keysToCamel(data);
}

/**
 * Supabase 응답 배열을 프론트엔드 타입으로 변환하는 래퍼
 */
export function transformResponseArray<T extends Record<string, unknown>>(
  data: T[] | null
): CamelCaseKeys<T>[] {
  if (data === null) return [];
  return arrayKeysToCamel(data);
}
