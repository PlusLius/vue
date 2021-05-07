/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
// Watcher 是一个 Class，在它的构造函数中，定义了一些和 Dep 相关的属性：
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  computed: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  dep: Dep;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    // 把当前 watcher 的实例赋值给 vm._watcher，
    if (isRenderWatcher) {
      vm._watcher = this
    }
    // 同时，还把当前 wathcer 实例 push 到 vm._watchers 中，
    // vm._watcher 是专门用来监听 vm 上数据变化然后重新渲染的，所以它是一个渲染相关的 watcher，
    // 因此在 callUpdatedHooks 函数中，只有 vm._watcher 的回调执行完毕后，才会执行 updated 钩子函数。
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep // deep watcher
      this.user = !!options.user // user watcher 通过 vm.$watch 创建的 watcher 是一个 user watcher，其实它的功能很简单，在对 watcher 求值以及在执行回调函数的时候，会处理一下错误，
      this.computed = !!options.computed // computed watcher  几乎就是为计算属性量身定制的，
      this.sync = !!options.sync // sync watcher
      this.before = options.before
    } else {
      this.deep = this.user = this.computed = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.computed // for computed watchers
//     其中，this.deps 和 this.newDeps 表示 Watcher 实例持有的 Dep 实例的数组
    this.deps = []
    this.newDeps = []
//     this.depIds 和 this.newDepIds 分别代表 this.deps 和 this.newDeps 的 id Set
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
//     可以发现 computed watcher 会并不会立刻求值，同时持有一个 dep 实例。
    if (this.computed) {
      this.value = undefined
      this.dep = new Dep()
    } else {
      this.value = this.get()
    }
  }
// Watcher 还定义了一些原型的方法，和依赖收集相关的有 get、addDep 和 cleanupDeps 方法
  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
//     当我们去实例化一个渲染 watcher 的时候，首先进入 watcher 的构造函数逻辑，然后会执行它的 this.get() 方法，进入 get 函数，首先会执行：
// export function pushTarget (_target: Watcher) {
//   if (Dep.target) targetStack.push(Dep.target)
//   Dep.target = _target
// }
//     实际上就是把 Dep.target 赋值为当前的渲染 watcher 并压栈（为了恢复用）。接着又执行了：
    pushTarget(this)
    let value
    const vm = this.vm
    try {
//       this.getter 对应就是 updateComponent 函数，这实际上就是在执行
//       vm._update(vm._render(), hydrating)
//       它会先执行 vm._render() 方法，因为之前分析过这个方法会生成 渲染 VNode，并且在这个过程中会对 vm 上的数据访问，这个时候就触发了数据对象的 getter。
//       那么每个对象值的 getter 都持有一个 dep，在触发 getter 的时候会调用 dep.depend() 方法，也就会执行 Dep.target.addDep(this)。
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
//       所以在 vm._render() 过程中，会触发所有数据的 getter，这样实际上已经完成了一个依赖收集的过程。那么到这里就结束了么，其实并没有，在完成依赖收集后，还有几个逻辑要执行
      if (this.deep) {
//         这个是要递归去访问 value，触发它所有子项的 getter
//         这样就创建了一个 deep watcher 了，在 watcher 执行 get 求值的过程中有一段逻辑
        traverse(value)
      }
//       Dep.target = targetStack.pop()
//       实际上就是把 Dep.target 恢复成上一个状态，因为当前 vm 的数据依赖收集已经完成，那么对应的渲染Dep.target 也需要改变。最后执行
      popTarget()
//       考虑到 Vue 是数据驱动的，所以每次数据变化都会重新 render，那么 vm._render() 方法又会再次执行，
//       并再次触发数据的 getters，所以 Watcher 在构造函数中会初始化 2 个 Dep 实例数组，newDeps 表示新添加的 Dep 实例数组，
//       而 deps 表示上一次添加的 Dep 实例数组。
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 添加一个依赖到这个指令
   */
// 刚才我们提到这个时候 Dep.target 已经被赋值为渲染 watcher，那么就执行到 addDep 方法：
  addDep (dep: Dep) {
    const id = dep.id
    //添加dep
//     这时候会做一些逻辑判断（保证同一数据不会被添加多次）后执行 dep.addSub(this)，
//     那么就会执行 this.subs.push(sub)，也就是说把当前的 watcher 订阅到这个数据持有的 dep 的 subs 中，
//     这个目的是为后续数据变化时候能通知到哪些 subs 做准备。
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
// 在执行 cleanupDeps 函数的时候，会首先遍历 deps，移除对 dep.subs 数组中 Wathcer 的订阅，
// 然后把 newDepIds 和 depIds 交换，newDeps 和 deps 交换，并把 newDepIds 和 newDeps 清空。
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
//         会首先遍历 deps，移除对 dep.subs  数组中 Wathcer 的订阅，
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
//     然后把 newDepIds 和 depIds 交换，newDeps 和 deps 交换，并把 newDepIds 和 newDeps 清空。
//     那么为什么需要做 deps 订阅的移除呢，在添加 deps 的订阅过程，已经能通过 id 去重避免重复订阅了。
//     因此 Vue 设计了在每次添加完新的订阅，会移除掉旧的订阅，这样就保证了在我们刚才的场景中，如果渲染 b 模板的时候去修改 a 模板的数据，a 数据订阅回调已经被移除了，所以不会有任何浪费
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
// 在一般组件数据更新的场景，会走到最后一个 queueWatcher(this) 的逻辑，queueWatcher
  update () {
    /* istanbul ignore else */
//     一旦我们对计算属性依赖的数据做修改，则会触发 setter 过程，通知所有订阅它变化的 watcher 更新，执行 watcher.update() 
//     我们知道计算属性本质上就是一个 computed watcher，也了解了它的创建过程和被访问触发 getter 以及依赖更新的过程，其实这是最新的计算属性的实现，
//     之所以这么设计是因为 Vue 想确保不仅仅是计算属性依赖的值发生变化，而是当计算属性最终计算的值发生变化才会触发渲染 watcher 重新渲染，本质上是一种优化。
    if (this.computed) {
      // A computed property watcher has two modes: lazy and activated.
      // It initializes as lazy by default, and only becomes activated when
      // it is depended on by at least one subscriber, which is typically
      // another computed property or a component's render function.
//       那么对于计算属性这样的 computed watcher，它实际上是有 2 种模式，lazy 和 active。
//       如果 this.dep.subs.length === 0 成立，则说明没有人去订阅这个 computed watcher 的变化，
//       仅仅把 this.dirty = true，只有当下次再访问这个计算属性的时候才会重新求值。在我们的场景下，渲染 watcher 订阅了这个 computed watcher 的变化，
      if (this.dep.subs.length === 0) {
        // In lazy mode, we don't want to perform computations until necessary,
        // so we simply mark the watcher as dirty. The actual computation is
        // performed just-in-time in this.evaluate() when the computed property
        // is accessed.
        this.dirty = true
      } else {
        // In activated mode, we want to proactively perform the computation
        // but only notify our subscribers when the value has indeed changed.
//         getAndInvoke 函数会重新计算，然后对比新旧值，如果变化了则执行回调函数，那么这里这个回调函数是 this.dep.notify()，在我们这个场景下就是触发了渲染 watcher 重新渲染。
        this.getAndInvoke(() => {
          this.dep.notify()
        })
      }
    } else if (this.sync) {
//       在我们之前对 setter 的分析过程知道，当响应式数据发送变化后，触发了 watcher.update()，只是把这个 watcher 推送到一个队列中，在 nextTick 后才会真正执行 watcher 的回调函数。而一旦我们设置了 sync，就可以在当前 Tick 中同步执行 watcher 的回调函数
      this.run()
    } else {
//       在一般组件数据更新的场景，会走到最后一个 queueWatcher(this) 的逻辑，queueWatcher
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
//     run 函数实际上就是执行 this.getAndInvoke 方法，并传入 watcher 的回调函数。
    if (this.active) {
      this.getAndInvoke(this.cb)
    }
  }
// getAndInvoke 函数逻辑也很简单，先通过 this.get() 得到它当前的值，然后做判断，如果满足新旧值不等、新值是对象类型、deep 模式任何一个条件
  getAndInvoke (cb: Function) {
//     ，先通过 this.get() 得到它当前的值，
//     所以这就是当我们去修改组件相关的响应式数据的时候，会触发组件重新渲染的原因，接着就会重新执行 patch 的过程，但它和首次渲染有所不同
    const value = this.get()
//     然后做判断，如果满足新旧值不等
//     新值是对象类型、deep 模式任何一个条件
//     ，则执行 watcher 的回调，
    if (
      value !== this.value ||
      // Deep watchers and watchers on Object/Arrays should fire even
      // when the value is the same, because the value may
      // have mutated.
      isObject(value) ||
      this.deep
    ) {
      // set new value
      const oldValue = this.value
      this.value = value
      this.dirty = false
//       通过 vm.$watch 创建的 watcher 是一个 user watcher，其实它的功能很简单，在对 watcher 求值以及在执行回调函数的时候，会处理一下错误
      if (this.user) {
        try {
//           ，则执行 watcher 的回调，
//           注意回调函数执行的时候会把第一个和第二个参数传入新值 value 和旧值 oldValue，这就是当我们添加自定义 watcher 的时候能在回调函数的参数中拿到新旧值的原因。
//           那么对于渲染 watcher 而言，它在执行 this.get() 方法求值的时候，会执行 getter 方法：
          cb.call(this.vm, value, oldValue)
        } catch (e) {
          handleError(e, this.vm, `callback for watcher "${this.expression}"`)
        }
      } else {
        cb.call(this.vm, value, oldValue)
      }
    }
  }

  /**
   * Evaluate and return the value of the watcher.
   * This only gets called for computed property watchers.
   * 计算并返回watcher的计算结果
   * 这只是对computed属性观察者的调用
   */
// evaluate 的逻辑非常简单，判断 this.dirty，如果为 true 则通过 this.get() 求值，
// 然后把 this.dirty 设置为 false。在求值过程中，会执行 value = this.getter.call(vm, vm)，
// 这实际上就是执行了计算属性定义的 getter 函数，在我们这个例子就是执行了 return this.firstName + ' ' + this.lastName。
// 这里需要特别注意的是，由于 this.firstName 和 this.lastName 都是响应式对象，这里会触发它们的 getter，
// 根据我们之前的分析，它们会把自身持有的 dep 添加到当前正在计算的 watcher 中，这个时候 Dep.target 就是这个 computed watcher。
  evaluate () {
    //dirty为true
    if (this.dirty) {
      //拿到最新的值
      this.value = this.get()
      //dirty为false
      this.dirty = false
    }
    //返回最新的值
//     最后通过 return this.value 拿到计算属性对应的值。我们知道了计算属性的求值过程，
    return this.value
  }

  /**
   * Depend on this watcher. Only for computed property watchers.
   * 只适用于computed属性的watcher
   */
// 然后当我们的 render 函数执行访问到 this.fullName 的时候，就触发了计算属性的 getter，它会拿到计算属性对应的 watcher，然后执行 watcher.depend()，
  depend () {
//     这时候的 Dep.target 是渲染 watcher，所以 this.dep.depend() 相当于渲染 watcher 订阅了这个 computed watcher 的变化。
    if (this.dep && Dep.target) {
      //执行depend
      this.dep.depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
