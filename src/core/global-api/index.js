/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index' // 拿到响应式后的sel,del把它弄成全局的，作为数组劫持后的缺陷的补充
import { ASSET_TYPES } from 'shared/constants' // 组件，指令，过滤器的一个常量定义
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick, // 多个watcher更新使用nextTick策略
  mergeOptions,
  defineReactive // 进行响应式依赖收集
} from '../util/index'

//初始化Vue实例的全局方法
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  //添加config属性
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  //提供了一些util方法
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive // 依赖收集
  }

  Vue.set = set // 通过静态方法也可以访问
  Vue.delete = del // 通过静态方法可以访问 
  Vue.nextTick = nextTick // 通过静态方法也可以访问

  Vue.options = Object.create(null)
  /**
   * export const ASSET_TYPES = [
        'component',
        'directive',
        'filter'
      ]
   */
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  /**
   * 
      Vue.options = {
        components: Object.create(null),
        directives: Object.create(null),
        filters: Object.create(null),
        _base: Vue
      }
   */
  Vue.options._base = Vue
  /**
   * Vue.options = {
        components: {
          KeepAlive
        },
        directives: Object.create(null),
        filters: Object.create(null),
        _base: Vue
     }
   */
  extend(Vue.options.components, builtInComponents)
  
  //Vue.use,Vue.mixin,Vue.Extend,Vue[assert]
  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}
