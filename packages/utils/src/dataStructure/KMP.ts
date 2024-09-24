export function manacher(s: string) {
  const str = sharpStr(s);
  const radiusArr = new Array(str.length);
  let C = 0;
  /**右边界，c + r + 1，最大值可以为 str.length 越界 */
  let R = 0;
  let maxIdx = 0;
  let maxRadius = 0;
  for (let i = 0; i < str.length; i++) {
    const mirrorIdx = 2 * C - i;
    radiusArr[i] = i < R ? Math.min(R - C, radiusArr[mirrorIdx]) : 1;
    while (
      i + radiusArr[i] < str.length &&
      i - radiusArr[i] >= 0 &&
      str[i + radiusArr[i]] === str[i - radiusArr[i]]
    ) {
      radiusArr[i]++;
    }
    if (i + radiusArr[i] > R) {
      C = i;
      R = i + radiusArr[i];
      if (radiusArr[i] > maxRadius) {
        maxRadius = radiusArr[i];
        maxIdx = C;
      }
    }
  }
  const mid = Math.floor(maxIdx / 2);
  const radius = Math.floor((maxRadius - 1) / 2);
  console.log(mid, radius);
  return s.slice(mid - radius, mid + radius + 1);

  /**有可能回文串的对称轴在虚轴处 */
  function sharpStr(str: string) {
    let res = '#';
    for (let i = 0; i < str.length; i++) {
      res += str[i] + '#';
    }
    return res;
  }
}

console.log(manacher('abacabadabacaba'));
console.log(manacher('abac'));
console.log(manacher('cdbabee'));
console.log(manacher('cdbabeeba'));
console.log(manacher('a'));
