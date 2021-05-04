/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

// Vue.component('my-component', {
//   // 选项
// }
// 全局组件注册
export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
//   export const ASSET_TYPES = [
//   'component',
//   'directive',
//   'filter'
// ]
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        // 且如果 type 是 component 且 definition 是一个对象的话，
        // 通过 this.opitons._base.extend，
        // 相当于 Vue.extend 把这个对象转换成一个继承于 Vue 的构造函数，
        // 最后通过 this.options[type + 's'][id] = definition 把它挂载到 Vue.options.components 上。
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
