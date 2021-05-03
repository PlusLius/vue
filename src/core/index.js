//Vue 实例和Vue API
import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'https://github.com/PlusLius/vue/blob/dev/src/core/index.js
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

//将Vue作为构造函数作为参数，传递给initGlobalAPI
// 见名知意，Vue的全局方法全部初始化了还提供了一些工具方法
initGlobalAPI(Vue)

//挂载isServer
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

//挂载ssrContext
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

//挂载FunctionalRenderContext
// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

//Vue的版本
Vue.version = '__VERSION__'

//导出Vue
export default Vue
