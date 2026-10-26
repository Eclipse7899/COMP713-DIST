import type { Mock } from 'bun:test';

type AnyFunction = (...args: any[]) => any;

export function mocked<T extends AnyFunction>(fn: T): Mock<T> {
  return fn as unknown as Mock<T>;
}
