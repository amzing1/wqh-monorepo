class Element<T> {
  value: T;
  root: Element<T>;
  next: Element<T>;
  size: number;
  constructor(v: T) {
    this.value = v;
    this.size = 1;
    this.next = this;
    this.root = this;
  }
}
/**并查集 */
export class UnionSet<T> {
  map: Map<T, Element<T>> = new Map();
  constructor(list: T[]) {
    list.forEach((v) => {
      const ele = new Element(v);
      this.map.set(v, ele);
    });
  }
  find(v: T) {
    let ele = this.map.get(v);
    if (!ele) return;
    while (ele !== ele.next) {
      ele.root = ele.next;
      ele = ele?.next;
    }
    return ele.root;
  }
  isInSameSet(a: T, b: T) {
    return this.find(a) === this.find(b);
  }
  union(a: T, b: T) {
    const rootA = this.find(a)!;
    const rootB = this.find(b)!;
    if (rootA !== rootB) {
      if (rootA.size > rootB.size) {
        rootB.next = rootA;
        rootA.size += rootB.size;
      } else {
        rootA.next = rootB;
        rootB.size += rootA.size;
      }
    }
  }
}

/**test */
const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const unionSet = new UnionSet(arr);
unionSet.union(1, 2);
unionSet.union(3, 4);
console.log(unionSet.isInSameSet(2, 4));
unionSet.union(1, 3);
console.log(unionSet.isInSameSet(2, 4));
