//将Vue功能拆分到各个模块，以原型链的形式进行组织
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

//定义vue构造函数
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    //当前实例不是用new初始化时报错
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  //当new Vue的时候看看init方法做了啥
  this._init(options)
}

//将构造函数交给init处理
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)  // vue.prototype.$emit, vue.prototype.$on .... 等事件的方法
lifecycleMixin(Vue)
renderMixin(Vue) // vue.prototype.$nextick,vue.prototype._render定义了2个方法

//Vue实例，Vue真正执行的地方
export default Vue

//总结使用Vue的时候实际进行了，
//init,stateinit,eventinit,lifecycleinit,renderinit
//方法的挂载
