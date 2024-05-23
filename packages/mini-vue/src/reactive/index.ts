/**
 * 读取对象属性的时候将副作用函数添加到桶中 track
 * 设置对象属性的时候将桶中的副作用函数拿出来执行 trigger
 */

import { arrayInstrumentations, shouldTrack } from './arrayInstrumentations';

type Fn = (...args: any[]) => any;
type VObj = Record<PropertyKey, any>;
type Bucket = WeakMap<VObj, Map<PropertyKey, Set<EffectFnWithDeps>>>;
type EffectFn = (...args: any[]) => any;
interface EffectFnWithDeps extends EffectFn {
  deps: Set<EffectFn>[];
  options: EffectOptions;
}
type EffectOptions = {
  scheduler?: Fn;
  lazy?: boolean;
};
type SetAttr<T extends Record<string, any>, U extends keyof T, V> = {
  [P in keyof T]: P extends U ? V : T[P];
};
type WatchOptions = {
  immediate?: boolean;
  flush?: 'post' | 'sync' | 'pre';
};
type ReactiveOptions = {
  isShallow?: boolean;
  isReadOnly?: boolean;
};

const bucket: Bucket = new WeakMap();
let activeEffect: EffectFnWithDeps | null = null;
const effectStack: EffectFnWithDeps[] = []; // 组件嵌套的情况下
export const ITERATE_KEY = Symbol(); // ownKeys / for in track
const reactiveMap = new Map<VObj, VObj>();

function effect(
  fn: EffectFn,
  options: SetAttr<EffectOptions, 'lazy', true>
): EffectFnWithDeps;
function effect(fn: EffectFn, options: EffectOptions): undefined;
function effect(fn: EffectFn): undefined;
function effect(
  fn: EffectFn,
  options: EffectOptions | SetAttr<EffectOptions, 'lazy', true> = {}
): undefined | EffectFnWithDeps {
  const cleanup = (fn: EffectFnWithDeps) => {
    for (let i = 0; i < fn.deps.length; i++) {
      const deps = fn.deps[i];
      deps.delete(effectFn);
    }
    fn.deps.length = 0;
  };
  const effectFn: EffectFnWithDeps = () => {
    cleanup(effectFn); // 清除旧依赖关系
    activeEffect = effectFn;
    effectStack.push(effectFn);
    const res = fn(); // 生成新依赖关系
    effectStack.pop();
    activeEffect = effectStack.at(-1) || null;
    return res;
  };
  effectFn.deps = [];
  effectFn.options = options;
  if (!effectFn.options.lazy) {
    effectFn();
  } else {
    return effectFn;
  }
}

function track(target: VObj, p: PropertyKey) {
  if (!activeEffect || !shouldTrack) return;
  let depsMap = bucket.get(target);
  if (!depsMap) {
    depsMap = new Map();
  }
  let deps = depsMap.get(p);
  if (!deps) {
    deps = new Set();
  }
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
  depsMap.set(p, deps);
  bucket.set(target, depsMap);
}
function trigger(
  target: VObj,
  p: PropertyKey,
  type: 'SET' | 'ADD' | 'DELETE',
  newValue: number | undefined
) {
  const depsMap = bucket.get(target);
  if (depsMap) {
    const depsSet = depsMap.get(p);
    const iterateSet = depsMap.get(ITERATE_KEY);
    const lengthSet = depsMap.get('length');
    const depsToRun = new Set<EffectFnWithDeps>();
    depsSet?.forEach((v) => {
      // proxy.value++ 会出现无限递归
      if (v !== activeEffect) {
        depsToRun.add(v);
      }
    });

    /**对象添加或者删除属性 */
    if (!Array.isArray(target) && (type === 'ADD' || type === 'DELETE')) {
      iterateSet?.forEach((v) => {
        if (v !== activeEffect) {
          depsToRun.add(v);
        }
      });
    }

    /**数组添加元素可能会触发 length 修改 */
    if (Array.isArray(target) && type === 'ADD') {
      lengthSet?.forEach((v) => {
        if (v !== activeEffect) {
          depsToRun.add(v);
        }
      });
    }

    /**修改数组的 length 属性，需要把数组内索引 >= length 的所有元素相关联的副作用函数取出并执行 */
    if (Array.isArray(target) && p === 'length') {
      depsMap.forEach((effects, key) => {
        if (Number(key) >= newValue!) {
          effects.forEach((fn) => {
            if (fn !== activeEffect) {
              depsToRun.add(fn);
            }
          });
        }
      });
    }

    depsToRun.forEach((v) => {
      // 通过调度器来将控制权交给用户
      if (v.options.scheduler) {
        v.options.scheduler(v);
      } else {
        v();
      }
    });
  }
}
const createReactive = <T extends VObj>(
  data: T,
  options: ReactiveOptions | undefined = {}
) => {
  const existionProxy = reactiveMap.get(data);
  if (existionProxy) {
    return existionProxy;
  }
  const proxy: T = new Proxy(data, {
    get(target: T, p: string | symbol, receiver) {
      // 获取被代理对象，在 trigger 中屏蔽由原型引起的更新
      if (p === 'raw') {
        return target;
      }
      if (Array.isArray(target) && p in arrayInstrumentations) {
        return Reflect.get(arrayInstrumentations, p, receiver);
      }
      // TODO 对 set 和 map 的代理
      if (target instanceof Set || target instanceof Map) {
        // Set 上的 size 属性是个访问器属性，调用 size 的过程中会检查 this 上是否存在 [[SetData]] 槽
        // 代理对象上没有这个槽，会报错，所以此处 this 应该还是指向源对象
        if (p === 'size') {
          track(target, ITERATE_KEY);
          return Reflect.get(target, p, target);
        }
        // Set / Map 上的方法也是同理
        // if (['add', ''])
        // return mutableInstrumentations[p];
      }
      if (!options.isReadOnly && typeof p !== 'symbol') {
        track(target, p);
      }
      const res = Reflect.get(target, p, receiver);
      if (!options.isShallow && typeof res === 'object' && res !== null) {
        //深响应
        return createReactive(res, options);
      }
      return res;
    },
    set(target: T, p: keyof T, newValue: any, receiver: any) {
      if (options.isReadOnly) {
        console.warn(`是只读的`);
        return true;
      }
      const oldValue = target[p];
      let type: 'SET' | 'ADD' = 'SET';
      if (Array.isArray(target)) {
        type = Number(p) >= target.length ? 'ADD' : 'SET';
      } else {
        type = Object.prototype.hasOwnProperty.call(target, p) ? 'SET' : 'ADD';
      }
      const res = Reflect.set(target, p, newValue, receiver);
      if (target === receiver.raw && !Object.is(oldValue, newValue)) {
        trigger(target, p, type, newValue);
      }
      return res;
    },
    has(target: T, p: string | symbol) {
      track(target, p);
      return Reflect.has(target, p);
    },
    ownKeys(target: T) {
      const key = Array.isArray(target) ? 'length' : ITERATE_KEY;
      track(target, key);
      return Reflect.ownKeys(target);
    },
    deleteProperty(target: T, p: string | symbol) {
      if (options.isReadOnly) {
        console.warn(`是只读的`);
        return true;
      }
      const hadKey = Object.prototype.hasOwnProperty.call(target, p);
      const res = Reflect.deleteProperty(target, p);
      if (res && hadKey) {
        trigger(target, p, 'DELETE', undefined);
      }
      return res;
    }
  });
  reactiveMap.set(data, proxy);
  return proxy;
};

// 计算属性的实现
function computed(getter: Fn) {
  let dirty = true;
  let res: unknown;
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      if (!dirty) {
        dirty = true;
        trigger(obj, 'value', 'SET', undefined);
      }
    }
  });
  const obj = {
    get value() {
      if (dirty) {
        res = effectFn();
        dirty = false;
      }
      track(obj, 'value');
      return res;
    }
  };
  return obj;
}
// watch 的实现
function watch(getter: EffectFn, cb: Fn, options: WatchOptions): void;
function watch(obj: Record<string, any>, cb: Fn, options: WatchOptions): void;
function watch(
  source: Record<string, any> | EffectFn,
  cb: Fn,
  options: WatchOptions = {}
): void {
  const traverse = (source: any, seen: Set<any> = new Set()) => {
    if (typeof source !== 'object' || source === null || seen.has(source)) {
      return;
    }
    seen.add(source);
    for (const key in source) {
      traverse(source[key], seen);
    }
    return seen;
  };
  const job = () => {
    newValue = watchEffect();
    if (cleanup) {
      cleanup();
    }
    cb(newValue, oldValue, onInvalidate);
    oldValue = newValue;
  };
  const onInvalidate = (fn: Fn) => {
    cleanup = fn;
  };
  let fn: EffectFn;
  if (typeof source === 'function') {
    fn = source as EffectFn;
  } else {
    fn = () => traverse(source);
  }
  let oldValue: unknown;
  let newValue: unknown;
  let cleanup: Fn; // 竞态问题
  const watchEffect = effect(fn, {
    lazy: true,
    scheduler: job
  });
  if (options.immediate) {
    job();
  } else {
    oldValue = watchEffect();
  }
}

function ref(data: any) {
  const wrapper = {
    value: data
  };
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  });

  return createReactive(wrapper);
}

export { computed, createReactive, effect, ref, track, trigger, watch };
