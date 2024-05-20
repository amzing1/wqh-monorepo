// class Promise {
//   constructor(executor) {
//     this.data = null;
//     this.callbacks = [];
//     this.status = "pending";
//     console.log("my custom promise");

//     const resolve = (val) => {
//       if (this.status !== "pending") {
//         return;
//       }
//       this.status = "fulfilled";
//       this.data = val;
//       setTimeout(() => {
//         this.callbacks.forEach((cb) => cb.onResolve());
//       }, 0);
//     };

//     const reject = (val) => {
//       if (this.status !== "pending") {
//         return;
//       }
//       this.status = "rejected";
//       this.data = val;
//       setTimeout(() => {
//         this.callbacks.forEach((cb) => cb.onReject());
//       }, 0);
//     };

//     try {
//       this.data = executor(resolve, reject);
//     } catch (e) {
//       reject(e);
//     }
//   }

//   then(onResolve, onReject) {
//     return new Promise((resolve, reject) => {
//       const handle = (cb) => {
//         try {
//           const ret = cb(this.data);
//           if (ret instanceof Promise) {
//             ret.then(resolve, reject);
//           } else {
//             reject(ret);
//           }
//         } catch (error) {
//           reject(error);
//         }
//       };
//       onResolve = onResolve instanceof Function ? onResolve : (val) => val;
//       onReject =
//         onReject instanceof Function
//           ? onReject
//           : (val) => {
//               throw val;
//             };

//       if (this.status === "pending") {
//         this.callbacks.push({
//           onResolve() {
//             handle(onResolve);
//           },
//           onReject() {
//             handle(onReject);
//           },
//         });
//       } else if (this.status === "resolved") {
//         handle(onResolve);
//       } else {
//         handle(onReject);
//       }
//     });
//   }

//   catch(onReject) {
//     return this.then(null, onReject);
//   }

//   finally(cb) {
//     return this.then(
//       (val) => {
//         this.resolve(cb()).then(() => val);
//       },
//       (reason) => {
//         this.resolve(cb()).then(() => {
//           throw reason;
//         });
//       }
//     );
//   }

//   static all(promises) {
//     return new Promise((resolve, reject) => {
//       const totalCount = promises.length;
//       const res = new Array(totalCount);
//       let finished = 0;
//       try {
//         for (let i = 0; i < totalCount; i++) {
//           promises[i].then(
//             (val) => {
//               res[i] = val;
//               finished++;
//               if (finished === totalCount) {
//                 resolve(res);
//               }
//             },
//             (reason) => {
//               throw reason;
//             }
//           );
//         }
//       } catch (error) {
//         reject(error);
//       }
//     });
//   }

//   static race(promises) {
//     return new Promise((resolve, reject) => {
//       try {
//         for (let i = 0; i < totalCount; i++) {
//           promises[i].then(
//             (val) => {
//               resolve(val);
//             },
//             (reason) => {
//               throw reason;
//             }
//           );
//         }
//       } catch (error) {
//         reject(error);
//       }
//     });
//   }

//   static resolve() {
//     return new Promise((resolve, reject) => {
//       resolve();
//     });
//   }
// }

// const p = new Promise((resolve, reject) => {
//   throw Error("error test");
// })
//   .then(
//     (data) => {
//       console.log(data);
//       return data + ", promise2";
//       // throw Error("error test");
//     },
//     (error) => {
//       console.log("hhh", error);
//     }
//   )
//   .then(
//     (data) => {
//       console.log(data);
//     },
//     (error) => {
//       console.log("hhh", error);
//     }
//   )
//   .catch((e) => {
//     console.log("hhh", e);
//   })
//   .finally(() => {
//     console.log("finally");
//   });
