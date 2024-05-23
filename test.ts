const obj = {
  b: 2,
  get a() {
    return this.b;
  }
};
const proxy = new Proxy(obj, {
  get(target, p: 'a' | 'b') {
    return target[p];
  }
});

console.log(proxy.a, proxy.b);
