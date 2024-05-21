/**
 * 读取对象属性的时候将副作用函数添加到桶中 track
 * 设置对象属性的时候将桶中的副作用函数拿出来执行 trigger
 */

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

const bucket: Bucket = new WeakMap();
let activeEffect: EffectFnWithDeps | null = null;
const effectStack: EffectFnWithDeps[] = []; // 组件嵌套的情况下

function effect(fn: EffectFn, options: SetAttr<EffectOptions, 'lazy', true>): EffectFnWithDeps;
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
  if (!activeEffect) return;
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
function trigger(target: VObj, p: PropertyKey) {
  const depsMap = bucket.get(target);
  if (depsMap) {
    const depsSet = depsMap.get(p);
    const depsToRun = new Set(depsSet);
    depsToRun?.forEach((v) => {
      // proxy.value++ 会出现无限递归
      if (v === activeEffect) {
        return;
      }
      // 通过调度器来将控制权交给用户
      if (v.options.scheduler) {
        v.options.scheduler(v);
      } else {
        v();
      }
    });
  }
}
const createReactive = <T extends VObj>(data: T) => {
  const proxy: T = new Proxy(data, {
    get(target: T, p: string | symbol) {
      track(target, p);
      return target[p];
    },
    set(target: T, p: keyof T, newValue: any) {
      target[p] = newValue;
      trigger(target, p);
      return true;
    }
  });
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
        trigger(obj, 'value');
      }
    }
  });
  const obj = {
    get value() {
      if (dirty) {
        console.log('computed get');
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
function watch(source: Record<string, any> | EffectFn, cb: Fn, options: WatchOptions = {}): void {
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

const data = {
  foo: 1,
  bar: 2
};
const obj = createReactive(data);
watch(
  () => obj.foo,
  () => {
    console.log('foo changed');
  },
  {}
);
obj.foo++;

export { computed, createReactive, effect };
