/**堆 */
export class Heap<T> {
  private list: T[];
  size: number;
  private compare: (a: T, b: T) => boolean;

  constructor(list: T[], compare: (a: T, b: T) => boolean) {
    this.list = list;
    this.size = 0;
    this.compare = compare;
  }

  push(v: T) {
    this.list.push(v);
    this.size++;
    this.siftUp();
  }

  pop() {
    if (this.size === 0) return;
    this.swap(0, this.size--);
    this.siftDown();
    return this.list[this.size];
  }

  private siftUp() {
    let cur = this.size - 1;
    while (cur > 0) {
      const parent = Math.floor((cur - 1) / 2);
      if (this.compare(this.list[parent], this.list[cur])) {
        this.swap(cur, parent);
        cur = parent;
      }
    }
  }
  private siftDown() {
    let cur = 0;
    let left = cur * 2 + 1;
    while (left < this.size) {
      if (
        left + 1 < this.size &&
        this.compare(this.list[left + 1], this.list[left])
      ) {
        left = left + 1;
      }
      if (this.compare(this.list[left], this.list[cur])) {
        this.swap(cur, left);
        cur = left;
        left = cur * 2 + 1;
      }
    }
  }
  private swap(i: number, j: number) {
    const temp = this.list[i];
    this.list[i] = this.list[j];
    this.list[j] = temp;
  }
}
