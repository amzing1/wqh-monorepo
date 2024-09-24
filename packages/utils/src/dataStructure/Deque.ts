/**
 * 双端队列
 */

export class Deque {
  private queue: number[];
  /**源数组 */
  private origin: number[];
  /**源数组上滑动窗口左边界下标索引 */
  private L: number;
  /**源数组上滑动窗口右边界下标索引 */
  private R: number;
  constructor(origin: number[]) {
    this.queue = [];
    this.origin = origin;
    this.L = 0;
    this.R = 0;
    if (this.queue.length) {
      this.queue.push(this.origin[this.R]);
    }
  }

  /**右边界右移 */
  moveRight() {
    const cur = this.origin[++this.R];
    while (this.queue.length && this.queue[this.queue.length - 1] <= cur) {
      this.queue.pop();
    }
    this.queue.push(this.R);
  }

  /**左边界右移 */
  moveLeft() {
    if (this.L === this.R) return;
    if (this.queue[0] === this.L) {
      this.queue.shift();
    }
    this.L++;
  }
}
