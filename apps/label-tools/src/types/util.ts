export type AddAttr<
  T extends Record<string, any>,
  Key extends string,
  Value
> = {
  [P in keyof T | Key]: P extends Key
    ? Value
    : P extends keyof T
    ? T[P]
    : never;
};

type Without<T, U> = {
  [P in Exclude<keyof T, keyof U>]?: never;
};
export type XOR<T, U> = (Without<T, U> & U) | (Without<U, T> & T);

export type ShowType<T> = {
  [P in keyof T]: T[P];
};

export type Fn = (...args: any[]) => any;
