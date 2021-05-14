/* @flow */

import { isRegExp, remove } from 'shared/util'
import { getFirstComponentChild } from 'core/vdom/helpers/index'

type VNodeCache = { [key: string]: ?VNode };

function getComponentName (opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag)
}
//      matches 的逻辑很简单，就是做匹配，
function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
//   分别处理了数组、字符串、正则表达式的情况，也就是说我们平时传的 include 和 exclude 可以是这三种类型的任意一种。
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

function pruneCache (keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance
//   ，其实就是对 cache 做遍历，
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]
    if (cachedNode) {
      const name: ?string = getComponentName(cachedNode.componentOptions)
//       发现缓存的节点名称和新的规则没有匹配上的时候，
      if (name && !filter(name)) {
//         就把这个缓存节点从缓存中摘除
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}

function pruneCacheEntry (
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {

  const cached = cache[key]
  //     除了从缓存中删除外，还要判断如果要删除的缓存并的组件 tag 不是当前渲染组件 tag，也执行删除缓存的组件实例的 $destroy 方法。
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy()
  }
  cache[key] = null
  remove(keys, key)
}
// 它们可以字符串或者表达式
const patternTypes: Array<Function> = [String, RegExp, Array]

export default {
  name: 'keep-alive',
  abstract: true,

  props: {
    include: patternTypes, // include 表示只有匹配的组件会被缓存
    exclude: patternTypes, // ，而 exclude 表示任何匹配的组件都不会被缓存
    max: [String, Number] //  ，props 还定义了 max，它表示缓存的大小，因为我们是缓存的 vnode 对象，它也会持有 DOM，当我们缓存很多的时候，会比较占用内存，所以该配置允许我们指定缓存大小。
  },

  created () {
   //  <keep-alive> 在 created 钩子里定义了 this.cache 和 this.keys，
   // 本质上它就是去缓存已经创建过的 vnode。它的 props 定义了 include，exclude，
    this.cache = Object.create(null)
    this.keys = []
  },

  destroyed () {
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted () {
//     <keep-alive> 组件也是为观测 include 和 exclude 的变化，对缓存做处理：
    this.$watch('include', val => {
//       逻辑很简单，观测他们的变化执行 pruneCache 函数
      pruneCache(this, name => matches(val, name))
    })
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },

  render () {
//     <keep-alive> 直接实现了 render 函数，而不是我们常规模板的方式，执行 <keep-alive> 组件渲染的时候，就会执行到这个 render 函数，
    const slot = this.$slots.default
//     由于我们也是在 <keep-alive> 标签内部写 DOM，所以可以先获取到它的默认插槽，然后再获取到它的第一个子节点。
//     <keep-alive> 只处理第一个子元素，所以一般和它搭配使用的有 component 动态组件或者是 router-view，这点要牢记。
    const vnode: VNode = getFirstComponentChild(slot)
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      // check pattern
      const name: ?string = getComponentName(componentOptions)
//       然后又判断了当前组件的名称和 include、exclude 的关系

      const { include, exclude } = this
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
//           并且我们的组件名如果满足了配置 include 且不匹配或者是配置了 exclude 且匹配，那么就直接返回这个组件的 vnode
        return vnode
      }
//     ，否则的话走下一步缓存：
      const { cache, keys } = this
      const key: ?string = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key
      //       这部分逻辑很简单
      if (cache[key]) {
//         如果命中缓存，则直接从缓存中拿 vnode 的组件实例，
        vnode.componentInstance = cache[key].componentInstance
        // make current key freshest
//         并且重新调整了 key 的顺序放在了最后一个；
        remove(keys, key)
        keys.push(key)
      } else {
//         否则把 vnode 设置进缓存
        cache[key] = vnode
        keys.push(key)
        // prune oldest entry
//         ，最后还有一个逻辑,如果配置了 max 并且缓存的长度超过了 this.max，还要从缓存中删除第一个
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }
// 最后设置 vnode.data.keepAlive = true 
      vnode.data.keepAlive = true
    }
    return vnode || (slot && slot[0])
  }
}
