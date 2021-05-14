/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
// 这个过程就是执行 resetSchedulerState 函数，
// 逻辑非常简单，就是把这些控制流程状态的一些变量恢复到初始值，把 watcher 队列清空。
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

/**
 * Flush both queues and run the watchers.
 */
// 队列排序
// queue.sort((a, b) => a.id - b.id) 对队列做了从小到大的排序，这么做主要有以下要确保以下几点：

// 1.组件的更新由父到子；因为父组件的创建过程是先于子的，所以 watcher 的创建也是先父后子，执行顺序也应该保持先父后子。

// 2.用户的自定义 watcher 要优先于渲染 watcher 执行；因为用户自定义 watcher 是在渲染 watcher 之前创建的。

// 3.如果一个组件在父组件的 watcher 执行期间被销毁，那么它对应的 watcher 执行都可以被跳过，所以父组件的 watcher 应该先执行。
function flushSchedulerQueue () {
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  // 队列排序
// queue.sort((a, b) => a.id - b.id) 对队列做了从小到大的排序，这么做主要有以下要确保以下几点：

// 1.组件的更新由父到子；因为父组件的创建过程是先于子的，所以 watcher 的创建也是先父后子，执行顺序也应该保持先父后子。

// 2.用户的自定义 watcher 要优先于渲染 watcher 执行；因为用户自定义 watcher 是在渲染 watcher 之前创建的。

// 3.如果一个组件在父组件的 watcher 执行期间被销毁，那么它对应的 watcher 执行都可以被跳过，所以父组件的 watcher 应该先执行。
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
//   队列遍历
// 在对 queue 排序后，接着就是要对它做遍历，拿到对应的 watcher，执行 watcher.run()。这里需要注意一个细节，
//   在遍历的时候每次都会对 queue.length 求值，因为在 watcher.run() 的时候，
//   很可能用户会再次添加新的 watcher，这样会再次执行到 queueWatcher
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    if (watcher.before) {
      watcher.before()
    }
    id = watcher.id
    has[id] = null
//     ，拿到对应的 watcher，执行 watcher.run()
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
//   等所有的渲染完毕，在 nextTick后会执行 flushSchedulerQueue，
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()
// 逻辑非常简单，就是把这些控制流程状态的一些变量恢复到初始值，把 watcher 队列清空。
  resetSchedulerState()

  // call component updated and activated hooks
//   也就是遍历所有的 activatedChildren，执行 activateChildComponent 方法，通过队列调的方式就是把整个 activated 时机延后了。
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
//   updatedQueue 是更新了的 wathcer 数组，那么在 callUpdatedHooks 函数中，
//  它对这些数组做遍历，只有满足当前 watcher 为 vm._watcher 以及组件已经 mounted 这两个条件，才会执行 updated 钩子函数
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
//   这个逻辑很简单，
  vm._inactive = false
//   把当前 vm 实例添加到 activatedChildren 数组中，等所有的渲染完毕，在 nextTick后会执行 flushSchedulerQueue，
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  //   也就是遍历所有的 activatedChildren，
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
//     执行 activateChildComponent 方法，通过队列调的方式就是把整个 activated 时机延后了。
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
// 这里引入了一个队列的概念，这也是 Vue 在做派发更新的时候的一个优化的点，
// 它并不会每次数据改变都触发 watcher 的回调，而是把这些 watcher 先添加到一个队列里，然后在 nextTick 后执行 flushSchedulerQueue。
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id
//   首先用 has 对象保证同一个 Watcher 只添加一次
  if (has[id] == null) {
    has[id] = true
//     接着对 flushing 的判断，
    if (!flushing) {
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
//       可以看到，这时候 flushing 为 true，就会执行到 else 的逻辑，
//       然后就会从后往前找，找到第一个待插入 watcher 的 id 比当前队列中 watcher 的 id 大的位置。
//       把 watcher 按照 id的插入到队列中，因此 queue 的长度发生了变化。
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
//     最后通过 waiting 保证对 nextTick(flushSchedulerQueue) 的调用逻辑只有一次，
    if (!waiting) {
      waiting = true
      nextTick(flushSchedulerQueue)
    }
  }
}
