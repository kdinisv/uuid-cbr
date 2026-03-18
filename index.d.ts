/// <reference types="node" />

export interface GeneratorOptions {
  node?: Buffer | number[] | string;
  clockSeq?: number;
  lastTime?: bigint | number | string;
  lastUSNS?: number;
}

export interface UuidStruct {
  time_low: number;
  time_mid: number;
  time_hi_and_version: number;
  clock_seq_hi_and_reserved: number;
  clock_seq_low: number;
  node: number[];
}

export interface UidInfo {
  len: number;
  valid: boolean;
  controlNum: string | undefined;
  gClockSeq: number;
  datetime: Date;
}

export type DatetimeInput = Date | number | string;

export function generate(datetime?: DatetimeInput): string;
export function uid_init(options?: GeneratorOptions): boolean;
export function uid_deinit(): void;
export function uid_create(datetime?: DatetimeInput): string;
export function uuid_init(options?: GeneratorOptions): boolean;
export function uuid_deinit(): void;
export function uuid_create(datetime?: DatetimeInput): UuidStruct;
export function isValid(data: string): boolean;
export function getTime(datetime?: DatetimeInput): number;
export function toDate(uuid: string): Date;
export function info(uuid: string): UidInfo;

declare const api: {
  generate: typeof generate;
  uid_init: typeof uid_init;
  uid_deinit: typeof uid_deinit;
  uid_create: typeof uid_create;
  uuid_init: typeof uuid_init;
  uuid_deinit: typeof uuid_deinit;
  uuid_create: typeof uuid_create;
  isValid: typeof isValid;
  getTime: typeof getTime;
  toDate: typeof toDate;
  info: typeof info;
};

export default api;
