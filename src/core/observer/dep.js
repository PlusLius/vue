/* @flow */

import Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
// Dep 是一个 Class，它定义了一些属性和方法，这里需要特别注意的是它有一个静态属性 target，
// 这是一个全局唯一 Watcher，这是一个非常巧妙的设计，因为在同一时间只能有一个全局的 Watcher 被计算，
// 另外它的自身属性 subs 也是 Watcher 的数组。
// Dep 实际上就是对 Watcher 的一种管理，Dep 脱离 Watcher 单独存在是没有意义的，为了完整地讲清楚依赖收集过程，我们有必要看一下 Watcher 的一些相关实现
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) {
    //将computed watcher加入到subs
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      //添加computed watcher.addDep将Dep添加进去
      Dep.target.addDep(this)
    }
  }
// 这里的逻辑非常简单，遍历所有的 subs，也就是 Watcher 的实例数组，然后调用每一个 watcher 的 update 方法，
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

export function pushTarget (_target: ?Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

export function popTarget () {
  Dep.target = targetStack.pop()
}
