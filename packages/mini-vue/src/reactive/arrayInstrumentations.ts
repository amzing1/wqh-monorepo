import { ITERATE_KEY, track, trigger } from '.';

type Include = (searchElement: any, fromIndex?: number | undefined) => boolean;
type IndexOf = (searchElement: any, fromIndex?: number | undefined) => number;
type Push = (...items: any[]) => number;
type Pop = () => any;
type ArgsType<T> = T extends (...args: infer Args) => any ? Args : never;
type ArrayInstrumentationsType = {
  includes: Include;
  raw?: any;
  indexOf: IndexOf;
  lastIndexOf: IndexOf;
  push: Push;
  unshift: Push;
  pop: Pop;
  shift: Pop;
};
// 代理 map/set/weakmap/weakset上的方法
type MutableInstrumentations = {
  raw?: any;
  add: (key: any) => unknown;
  delete: (key: any) => unknown;
  get: (key: any) => unknown;
  set: (key: any, value: any) => unknown;
  forEach: (callback: any) => unknown;
};

export let shouldTrack = true;
export const arrayInstrumentations: ArrayInstrumentationsType = {
  // 这些查找元素的方法会因为代理对象和源对象不是同一个对象导致返回错误的结果
  // 所以需要对这些方法进行拦截
  includes(...args: ArgsType<Include>): boolean {
    const originMethod = Array.prototype.includes;
    let res = originMethod.apply(this, args);
    if (res === false) {
      res = originMethod.apply(this.raw, args);
    }
    return res;
  },
  indexOf(...args: ArgsType<IndexOf>): number {
    const originMethod = Array.prototype.indexOf;
    let res = originMethod.apply(this, args);
    if (res === -1) {
      res = originMethod.apply(this.raw, args);
    }
    return res;
  },
  lastIndexOf(...args: ArgsType<IndexOf>): number {
    const originMethod = Array.prototype.lastIndexOf;
    let res = originMethod.apply(this, args);
    if (res === -1) {
      res = originMethod.apply(this.raw, args);
    }
    return res;
  },
  // 这些会修改数组长度的方法会同时读取和修改数组的 length 属性，在副作用函数内会造成无限递归
  // 解决方法就是使用这些方法时不让 length 触发 track 依赖收集
  push(...args: ArgsType<typeof Array.prototype.push>): number {
    const originMethod = Array.prototype.push;
    shouldTrack = false;
    const res = originMethod.apply(this, args);
    shouldTrack = true;
    return res;
  },
  pop(...args: ArgsType<typeof Array.prototype.pop>): number {
    const originMethod = Array.prototype.pop;
    shouldTrack = false;
    const res = originMethod.apply(this, args);
    shouldTrack = true;
    return res;
  },
  shift(...args: ArgsType<typeof Array.prototype.shift>): number {
    const originMethod = Array.prototype.shift;
    shouldTrack = false;
    const res = originMethod.apply(this, args);
    shouldTrack = true;
    return res;
  },
  unshift(...args: ArgsType<typeof Array.prototype.unshift>): number {
    const originMethod = Array.prototype.push;
    shouldTrack = false;
    const res = originMethod.apply(this, args);
    shouldTrack = true;
    return res;
  }
};

export const mutableInstrumentations: MutableInstrumentations = {
  add(p: string | symbol) {
    const target = this.raw as Set<unknown>;
    const hasKey = target.has(p);
    const res = target.add(p);
    if (!hasKey) {
      trigger(target, p, 'ADD', undefined);
    }
    return res;
  },
  delete(p: string | symbol) {
    const target = this.raw;
    const hasKey = target.has(p);
    const res = target.delete(p);
    if (hasKey) {
      trigger(target, p, 'DELETE', undefined);
    }
    return res;
  },
  get(p: string | symbol) {
    const target = this.raw;
    const hasKey = target.has(p);
    track(target, p);
    if (hasKey) {
      const res = target.get(p);
      return res; // 注意返回的如果是对象需要再包一层 reactive
    }
  },
  set(p: string | symbol, value: any) {
    const target = this.raw;
    const hasKey = target.has(p);
    const oldValue = target.get(p);
    // 把响应式数据设置到原始数据上的行为称为数据污染
    // target.set(p, value);
    target.set(p, value.raw || value);
    if (!hasKey) {
      trigger(target, p, 'ADD', undefined);
    } else if (!Object.is(oldValue, value)) {
      trigger(target, p, 'SET', undefined);
    }
  },
  forEach(callback: any) {
    const target = this.raw;
    track(target, ITERATE_KEY);
    target.forEach(callback);
  }
};
