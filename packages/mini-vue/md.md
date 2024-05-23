### vue3 响应式原理关键点

1. 副作用函数
   执行一个函数的同时会产生一些外部的影响
   比如说修改一个数据，html body 内的内容产生了变动（自动地进行了 dom 操作）
2. Proxy
   获得一个对象的代理对象，通过这个代理对象可以拦截到一些基本的 js 语义操作
   比如 get / set / has / deleteProperty / ownkeys
3. Reflect
   通过 Reflect 可以执行 js 的一些基本语义操作, 与 Proxy 可以拦截的语义操作
   一一对应，使用 Reflect 执行 js 基本语义操作的好处就是某些操作可以定义 this 的值
   比如 get 和 set
   这在 vue3 的响应式系统中非常重要
4. track - 依赖收集
   在副作用函数中执行对某个代理对象的 get / has / ownKeys 等属性获取操作时拦截这些操作
   并进行依赖收集，填充 `WeakMap<VObj, Map<PropertyKey, Set<effectFunction>>>` bucket 结构，
   其中 VObject 就是该代理对象，PropertyKey 则表示正在获取的属性名(get)或者自己手动指定唯一键值，effectFunction 就是副作用函数本身（其实对用户传入的副作用函数又包裹了一层）
5. trigger - 触发依赖
   拦截 set / delete 操作的同时看看 bucket 中有没有关联的副作用函数，有的话就触发。
6. computed 的实现
7. watch 的实现
8. 对数组进行代理
