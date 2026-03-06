import { Accessor, createSignal, Setter } from 'solid-js';

// Type definition
export type ObjectSignal<T, GK extends string = 'get', SK extends string = 'set'> =
  { [K in GK]: Accessor<T> } &
  { [K in SK]: Setter<T> };

// Overloads
export function createObjectSignal<T, GK extends 'get'>(
  initial: T,
): ObjectSignal<T, 'get', 'set'>;

export function createObjectSignal<T, GK extends string>(
  initial: T,
  getKey: GK,
): ObjectSignal<T, GK, `set${Capitalize<string & GK>}`>;

export function createObjectSignal<
  T,
  GK extends string,
  SK extends 'set' | `set${Capitalize<GK>}` = 'set',
>(
  initial: T,
  key: GK,
): ObjectSignal<T, GK, SK>;

// Implementation
export function createObjectSignal<
  T,
  GK extends string = 'get',
  SK extends 'set' | `set${Capitalize<GK>}` = 'set',
>(
  initial: T,
  key?: GK
): ObjectSignal<T, GK, SK> {
  const [get, set] = createSignal<T>(initial)

  const g = (key ?? 'get') as unknown as GK
  const s = g === 'get'
    ? 'set'
    : `set${g.charAt(0).toUpperCase() + g.slice(1)}` as SK

  return {
    [g]: get,
    [s]: set,
  } as ObjectSignal<T, GK, SK>
}
