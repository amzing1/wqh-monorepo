/**通过单调栈来寻找数组中每个数左右离自己最近的比自己大的数 */
export function getLowerstMaxThenSelf(arr: number[]) {
  const monoStack: number[] = [];
  const res = new Array(arr.length).fill([-1, -1]);
  for (let i = 0; i < arr.length; i++) {
    while (monoStack.length && arr[monoStack[monoStack.length - 1]] < arr[i]) {
      const idx = monoStack.pop()!;
      res[idx] = [monoStack.length ? monoStack[monoStack.length - 1] : -1, i];
    }
    monoStack.push(i);
    console.log('monoStack', monoStack);
  }
  while (monoStack.length) {
    const idx = monoStack.pop()!;
    res[idx] = [monoStack.length ? monoStack[monoStack.length - 1] : -1, -1];
  }
  return res;
}

/**test */
const arr = [3, 7, 5, 2, 1, 9, 8, 6];
console.log(getLowerstMaxThenSelf(arr));
