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

//将构造函数交给init处理，mixin的方法总的来看就是对vue实例的原型上混入各种方法
initMixin(Vue) // vue.prototype._init方法，这个方法调用的时候会执行state,events,lifecycle,render的init方法
stateMixin(Vue) // 对options.data,computed,props，watch,$watch进行响应式监听
eventsMixin(Vue)  // vue.prototype.$emit, vue.prototype.$on .... 等事件的方法
lifecycleMixin(Vue) // vue.prototype._update,$forceUpdate,$destrop 组件更新销毁时的方法
renderMixin(Vue) // vue.prototype.$nextick,vue.prototype._render定义了2个方法

//Vue实例，Vue真正执行的地方
export default Vue

//总结使用Vue的时候实际进行了，
//init,stateinit,eventinit,lifecycleinit,renderinit
//方法的挂载
