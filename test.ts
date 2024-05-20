const obj = {
  a: 1,
  b: 2,
};
const obj2 = {
  a: 3,
  b: 4,
};
const proxy = new Proxy(obj, {
  get(target, p, receiver) {
    return Reflect.get(obj2, p, receiver);
  },
});
console.log(proxy.a, proxy.b);
