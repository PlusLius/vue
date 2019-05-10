## Vue初始化

> 为对象上挂方法挂属性

```js
const Vue = require('./vue')

function Vue (options) {
    if (!(this instanceof Vue)
    ) {
    warn('Vue is a constructor and should be called with the `new` keyword');
    }
    this._init(options);
}
  
initMixin(Vue);
stateMixin(Vue);
eventsMixin(Vue);
lifecycleMixin(Vue);
renderMixin(Vue);

function initGlobalAPI (Vue) {
    // config
    var configDef = {};
    configDef.get = function () { return config; };
    {
    configDef.set = function () {
        warn(
        'Do not replace the Vue.config object, set individual fields instead.'
        );
    };
    }
    Object.defineProperty(Vue, 'config', configDef);

    // exposed util methods.
    // NOTE: these are not considered part of the public API - avoid relying on
    // them unless you are aware of the risk.
    Vue.util = {
    warn: warn,
    extend: extend,
    mergeOptions: mergeOptions,
    defineReactive: defineReactive$$1
    };

    Vue.set = set;
    Vue.delete = del;
    Vue.nextTick = nextTick;

    // 2.6 explicit observable API
    Vue.observable = function (obj) {
    observe(obj);
    return obj
    };

    Vue.options = Object.create(null);
    ASSET_TYPES.forEach(function (type) {
    Vue.options[type + 's'] = Object.create(null);
    });

    // this is used to identify the "base" constructor to extend all plain-object
    // components with in Weex's multi-instance scenarios.
    Vue.options._base = Vue;

    extend(Vue.options.components, builtInComponents);

    initUse(Vue);
    initMixin$1(Vue);
    initExtend(Vue);
    initAssetRegisters(Vue);
}
  
initGlobalAPI(Vue);
```

## new Vue的时候做了什么

```js
//还没有new时的状态
Vue {
    $data:undefined
    $isServer:false
    $props:undefined
    $ssrContext:undefined
    __proto__:Object {_init: , $set: , $delete: , …}
}
```

```js
//走完init之后,把create,creaated生命周期走完，将data/props解析完成
Vue {_uid: 0, _isVue: true, $options: Object, _renderProxy: Proxy, _self: Vue, …}
_c: function (a, b, c, d) { … }
_data: Object {test: <accessor>, __ob__: Observer}
_directInactive: false
_events: Object {}
_hasHookEvent: false
_inactive: null
_isBeingDestroyed: false
_isDestroyed: false
_isMounted: false
_isVue: true
_renderProxy: Proxy {_uid: 0, _isVue: true, $options: Object, …}
_self: Vue {_uid: 0, _isVue: true, $options: Object, …}
_staticTrees: null
_uid: 0
_vnode: null
_watcher: null
_watchers: Array(0) []
$attrs: Object
$children: Array(0) []
$createElement: function (a, b, c, d) { … }
$data: Object
$isServer: false
$listeners: Object
$options: Object {components: Object, directives: Object, filters: Object, …}
$parent: undefined
$props: undefined
$refs: Object {}
$root: Vue {_uid: 0, _isVue: true, $options: Object, …}
$scopedSlots: Object {}
$slots: Object {}
$ssrContext: undefined
$vnode: undefined
test: 1
__proto__: Object {_init: , $set: , $delete: , …}

```

```js
function Vue (options) {
    //...
    //把配置交给了init处理
    this._init(options);
}
```

```js
 var uid$3 = 0;
 Vue.prototype._init = function (options) {
        var vm = this; // vue instance
        // 标识vue实例
        vm._uid = uid$3++;
  
        var startTag, endTag;
        /* istanbul ignore if */
        if (config.performance && mark) {
          startTag = "vue-perf-start:" + (vm._uid);
          endTag = "vue-perf-end:" + (vm._uid);
          mark(startTag);
        }
  
        // 用来被避免观察的标志
        vm._isVue = true;
        // merge options
        if (options && options._isComponent) {
          // optimize internal component instantiation
          // since dynamic options merging is pretty slow, and none of the
          // internal component options needs special treatment.
          initInternalComponent(vm, options);
        } else {
            //new的时候走了这个，可以好好研究下mergeOptions合并策略
          vm.$options = mergeOptions(
            resolveConstructorOptions(vm.constructor),
            options || {},
            vm
          );
        }
        /* istanbul ignore else */
        {
          initProxy(vm);
        }
        // vm -> _self
        vm._self = vm;
        initLifecycle(vm);//初始化生命周期
        initEvents(vm);//初始化事件
        initRender(vm);//初始化render函数
        callHook(vm, 'beforeCreate');//调用beforeCreate钩子
        initInjections(vm); //在data/props之前解析注入
        initState(vm); //解析
        initProvide(vm); //解析完之后提供data/props
        callHook(vm, 'created'); //调用created钩子
  
        /* istanbul ignore if */
        if (config.performance && mark) {
          vm._name = formatComponentName(vm, false);
          mark(endTag);
          measure(("vue " + (vm._name) + " init"), startTag, endTag);
        }
        //初始化完成后调用$mount挂载
        if (vm.$options.el) {
          vm.$mount(vm.$options.el);
        }
};
```

## 全局配置

> Vue.config 是一个对象，包含 Vue 的全局配置。可以在启动应用之前修改下列属性：

```js
 var config = ({
      /**
       * Option merge strategies (used in core/util/options)
        * Vue.config.optionMergeStrategies._my_option = function (parent, child, vm) {
            return child + 1
            }

            const Profile = Vue.extend({
            _my_option: 1
            })

            // Profile.options._my_option = 2

            自定义合并策略的选项。

            合并策略选项分别接收在父实例和子实例上定义的该选项的值作为第一个和第二个参数，Vue 实例上下文被作为第三个参数传入。
       */
      // $flow-disable-line
      optionMergeStrategies: Object.create(null),
  
      /**
       * 
       * 为true时取消 Vue 所有的日志与警告。
       */
      silent: false,
  
      /**
       *
       * 设置为 false 以阻止 vue 在启动时生成生产提示。
       */
      productionTip: "development" !== 'production',
  
      /**
       * Whether to enable devtools
       * 配置是否允许 vue-devtools 检查代码。开发版本默认为 true，生产版本默认为 false。生产版本设为 true 可以启用检查。
       * // 务必在加载 Vue 之后，立即同步设置以下内容
        Vue.config.devtools = true
       */
      devtools: "development" !== 'production',
  
      /**
       * 
       * 设置为 true 以在浏览器开发工具的性能/时间线面板中启用对组件初始化、编译、渲染和打补丁的性能追踪。只适用于开发模式和支持 performance.mark API 的浏览器上。
       */
      performance: false,
  
      /**
       * 
       * Vue.config.errorHandler = function (err, vm, info) {
            // handle error
            // `info` 是 Vue 特定的错误信息，比如错误所在的生命周期钩子
            // 只在 2.2.0+ 可用
        }
        指定组件的渲染和观察期间未捕获错误的处理函数。这个处理函数被调用时，可获取错误信息和 Vue 实例。
       */
      errorHandler: null,
  
      /**
       * 
        * Vue.config.warnHandler = function (msg, vm,     trace) {
             // `trace` 是组件的继承关系追踪
          }
          为 Vue 的运行时警告赋予一个自定义处理函数。注意这只会在开发者环境下生效，在生产环境下它会被忽略。
       */
      warnHandler: null,
  
      /**
       * Ignore certain custom elements
       * Vue.config.ignoredElements = [
            'my-custom-web-component',
            'another-web-component',
            // 用一个 `RegExp` 忽略所有“ion-”开头的元素
            // 仅在 2.5+ 支持
            /^ion-/
         ]
         须使 Vue 忽略在 Vue 之外的自定义元素 (e.g. 使用了 Web Components APIs)。否则，它会假设你忘记注册全局组件或者拼错了组件名称，从而抛出一个关于 Unknown custom element 的警告。
       */
      ignoredElements: [],
  
      /**
       * 
       * Vue.config.keyCodes = {
            v: 86,
            f1: 112,
            // camelCase 不可用
            mediaPlayPause: 179,
            // 取而代之的是 kebab-case 且用双引号括起来
            "media-play-pause": 179,
            up: [38, 87]
        }
        <input type="text" @keyup.media-play-pause="method">
       */
      keyCodes: Object.create(null),
  
      /**
       * Check if a tag is reserved so that it cannot be registered as a
       * component. This is platform-dependent and may be overwritten.
       */
      isReservedTag: no,
  
      /**
       * Check if an attribute is reserved so that it cannot be used as a component
       * prop. This is platform-dependent and may be overwritten.
       */
      isReservedAttr: no,
  
      /**
       * Check if a tag is an unknown element.
       * Platform-dependent.
       */
      isUnknownElement: no,
  
      /**
       * Get the namespace of an element
       */
      getTagNamespace: noop,
  
      /**
       * Parse the real tag name for the specific platform.
       */
      parsePlatformTagName: identity,
  
      /**
       * Check if an attribute must be bound using property, e.g. value
       * Platform-dependent.
       */
      mustUseProp: no,
  
      /**
       * Perform updates asynchronously. Intended to be used by Vue Test Utils
       * This will significantly reduce performance if set to false.
       */
      async: true,
  
      /**
       * Exposed for legacy reasons
       */
      _lifecycleHooks: LIFECYCLE_HOOKS
    });
```

```js
 function initGlobalAPI (Vue) {
      // config
      var configDef = {};
      configDef.get = function () { return config; };
      {
        configDef.set = function () {
          warn(
            'Do not replace the Vue.config object, set individual fields instead.'
          );
        };
      }
      //当我们使用Vue.config的全局配置的时候拿到config配置
      Object.defineProperty(Vue, 'config', configDef);
```

## 全局API

### Vue.extend在初始化的时候会初始化extend

```js
// 创建构造器
var Profile = Vue.extend({
    template: '<p>{{firstName}} {{lastName}} aka {{alias}}</p>',
    data: function () {
      return {
        firstName: 'Walter',
        lastName: 'White',
        alias: 'Heisenberg'
      }
    }
  })
  // 创建 Profile 实例，并挂载到一个元素上。
  new Profile().$mount('#mount-point')
```

```js
initGlobalAPI(Vue)

function initGlobalAPI(){
      //...
      initUse(Vue);
      initMixin$1(Vue);
      initExtend(Vue);
      initAssetRegisters(Vue);
}
```

```js
//表示是父id
  Vue.cid = 0;
    var cid = 1;
    Vue.extend = function (extendOptions) {
        //传入的Profile
        extendOptions = extendOptions || {};
        //拿到根vue
        var Super = this;
        //拿到父id
        var SuperId = Super.cid;
        //缓存一个ctors
        var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
        //拿到这个父id去缓存里找
        if (cachedCtors[SuperId]) {
          return cachedCtors[SuperId]
        }
  
        var name = extendOptions.name || Super.options.name;
        if (name) {
          validateComponentName(name);
        }
        //创建子类构造函数
        var Sub = function VueComponent (options) {
          this._init(options);
        };
        //继承父类原型
        Sub.prototype = Object.create(Super.prototype);
        //将子类构造函数指向自己
        Sub.prototype.constructor = Sub;
        //给子类打上cid
        Sub.cid = cid++;
        //子类合并父类options
        Sub.options = mergeOptions(
          Super.options,
          extendOptions
        );
        //保存父类的引用
        Sub['super'] = Super;
  
        // For props and computed properties, we define the proxy getters on
        // the Vue instances at extension time, on the extended prototype. This
        // avoids Object.defineProperty calls for each instance created.
        if (Sub.options.props) {
          initProps$1(Sub);
        }
        if (Sub.options.computed) {
          initComputed$1(Sub);
        }
  
        // allow further extension/mixin/plugin usage
        Sub.extend = Super.extend;
        Sub.mixin = Super.mixin;
        Sub.use = Super.use;
  
        // create asset registers, so extended classes
        // can have their private assets too.
        ASSET_TYPES.forEach(function (type) {
          Sub[type] = Super[type];
        });
        // enable recursive self-lookup
        if (name) {
          Sub.options.components[name] = Sub;
        }
  
        // keep a reference to the super options at extension time.
        // later at instantiation we can check if Super's options have
        // been updated.
        Sub.superOptions = Super.options;
        Sub.extendOptions = extendOptions;
        Sub.sealedOptions = extend({}, Sub.options);
  
        // 缓存constructor,通过父id可以找到子类构造函数
        cachedCtors[SuperId] = Sub;
        return Sub
      };
```

```js
function initMixin (Vue) {
    //...
    vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
    );
}
//在使用extend的时候vm.$options是contructor中的$options
 function resolveConstructorOptions (Ctor) {
      var options = Ctor.options;
      //看下该子类有没有父类
      if (Ctor.super) {
          //拿到父类options
        var superOptions = resolveConstructorOptions(Ctor.super);
        //拿到缓存的options
        var cachedSuperOptions = Ctor.superOptions;
        //拿到当前父类配置和之前子类缓存的父类配置进行比较
        //如果比较不一致说明发生类改变
        if (superOptions !== cachedSuperOptions) {
          // super option changed,
          // need to resolve new options.
          Ctor.superOptions = superOptions;
          // check if there are any late-modified/attached options (#4976)
          var modifiedOptions = resolveModifiedOptions(Ctor);
          // update base extend options
          if (modifiedOptions) {
            extend(Ctor.extendOptions, modifiedOptions);
          }
          options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
          if (options.name) {
            options.components[options.name] = Ctor;
          }
        }
      }
      //返回options
      return options
    }
  
```

### Vue.nextTick

```js
// 修改数据
vm.msg = 'Hello'
// DOM 还没有更新
Vue.nextTick(function () {
  // DOM 更新了
})

// 作为一个 Promise 使用 (2.1.0 起新增，详见接下来的提示)
Vue.nextTick()
  .then(function () {
    // DOM 更新了
  })

```

```js
   function initGlobalAPI (Vue) {
     //...
      Vue.nextTick = nextTick;
    } 
    initGlobalAPI(Vue);
```

```js
  function nextTick (cb, ctx) {
      var _resolve;
      callbacks.push(function () {
        if (cb) {
          try {
              //普通回到完成走这个
            cb.call(ctx);
          } catch (e) {
            handleError(e, ctx, 'nextTick');
          }
        } else if (_resolve) {
            //promise完成后走这个
          _resolve(ctx);
        }
      });
      if (!pending) {
          //执行的时候锁住
        pending = true;
        timerFunc();
      }
      // $flow-disable-line
      if (!cb && typeof Promise !== 'undefined') {
        return new Promise(function (resolve) {
          _resolve = resolve;
        })
      }
    }
```

```js
    function flushCallbacks () {
      pending = false;
      var copies = callbacks.slice(0);
      callbacks.length = 0;
      for (var i = 0; i < copies.length; i++) {
        copies[i]();
      }
    }

    if (typeof Promise !== 'undefined' && isNative(Promise)) {
      var p = Promise.resolve();
      timerFunc = function () {
        p.then(flushCallbacks);
        // In problematic UIWebViews, Promise.then doesn't completely break, but
        // it can get stuck in a weird state where callbacks are pushed into the
        // microtask queue but the queue isn't being flushed, until the browser
        // needs to do some other work, e.g. handle a timer. Therefore we can
        // "force" the microtask queue to be flushed by adding an empty timer.
        if (isIOS) { setTimeout(noop); }
      };
```