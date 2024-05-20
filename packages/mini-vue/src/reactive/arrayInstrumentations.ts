type Include = (searchElement: any, fromIndex?: number | undefined) => boolean;
type IndexOf = (searchElement: any, fromIndex?: number | undefined) => number;
type ArgsType<T> = T extends (...args: infer Args) => any ? Args : never;
type arrayInstrumentationsType = {
  includes: Include;
  raw?: any;
  indexOf: IndexOf;
  lastIndexOf: IndexOf;
};

export const arrayInstrumentations: arrayInstrumentationsType = {
  // indexOf lastIndexOf 同理
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
};
