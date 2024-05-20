// function SuperType() {
//   this._kk = 'parent';
//   this.colors = ['r'];
// }
// SuperType.prototype.sayHi = () => {
//   console.log('hi~');
// };
// function SubType() {
//   SuperType.call(this);
//   this.self = 'sub';
// }

// function inherit(Parent, Child) {
//   const o = Object.create(Parent.prototype);
//   o.prototype = Child;
//   Child.prototype = o;
// }

// inherit(SuperType, SubType);

// SubType.prototype.sayHello = () => {
//   console.log('hello~');
// };

// const sub = new SubType();
// sub._kk = 'wu';
// sub.sayHi();
// console.log(sub);
