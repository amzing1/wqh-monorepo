// function Demo() {
//   this.a = 1;
//   this.b = 2;
//   this.c = 3;
// }
// Demo.prototype[Symbol.iterator] = function () {
//   let i = 0;
//   let that = this;
//   return {
//     next() {
//       if (i === 0) {
//         i++;
//         return {
//           value: that.a,
//           done: false,
//         };
//       } else if (i === 1) {
//         i++;
//         return {
//           value: that.b,
//           done: false,
//         };
//       } else if (i === 2) {
//         i++;
//         return {
//           value: that.c,
//           done: false,
//         };
//       } else {
//         return {
//           value: undefined,
//           done: true,
//         };
//       }
//     },
//   };
// };

// const d = new Demo();
// for (let a of d) {
//   console.log(a);
// }
// for (let a of d) {
//   console.log(a);
// }
