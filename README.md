## Vue初始化

1. 为对象上挂方法挂属性
2. Vue.config就是设置全局的一些配置
3. Vue.xxx静态方法
4. Vue.$xxx实例属性/方法
5. 选项就是new Vue({})中能够被解析的一些参数比如：
const Child = {
  inject: ['foo'],
  data () {
    return {
      bar: this.foo
    }
  }
}


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

### Vue.set/delete

```js
var vm = new Vue({
    data: {
        test: 1
    }
})

var vm2 = Vue.extend({})

Vue.set(vm2, 'b', 2)
```

```js
//vm.test拿到_data中的值_data代理的就是options[data]中的值
  function proxy (target, sourceKey, key) {
      sharedPropertyDefinition.get = function proxyGetter () {
        //Vue[_data]['test']
        return this[sourceKey][key]
      };
      sharedPropertyDefinition.set = function proxySetter (val) {
        this[sourceKey][key] = val;
      };
      Object.defineProperty(target, key, sharedPropertyDefinition);
    }
  
```

```js
//全局API基本都是在initGlobalAPI的时候进行挂载的
  function initGlobalAPI (Vue) {
     //...
      Vue.set = set;
  } 
  initGlobalAPI(Vue);

```

```js
 function isUndef (v) {
      return v === undefined || v === null
  
 }
  function isPrimitive (value) {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      // $flow-disable-line
      typeof value === 'symbol' ||
      typeof value === 'boolean'
    )
  }}
  function set (target, key, val) {
      if (isUndef(target) || isPrimitive(target)
      ) {
        warn(("Cannot set reactive property on undefined, null, or primitive value: " + ((target))));
      }
      if (Array.isArray(target) && isValidArrayIndex(key)) {
        target.length = Math.max(target.length, key);
        target.splice(key, 1, val);
        return val
      }
      if (key in target && !(key in Object.prototype)) {
        target[key] = val;
        return val
      }
      var ob = (target).__ob__;
      //_isVue用来判断是不是根实例,或vue实例的根数据对象
      if (target._isVue || (ob && ob.vmCount)) {
        warn(
          'Avoid adding reactive properties to a Vue instance or its root $data ' +
          'at runtime - declare it upfront in the data option.'
        );
        return val
      }
      if (!ob) {
        //tagert['b'] = 1
        target[key] = val;
        //返回设置结果
        return val
      }
      defineReactive$$1(ob.value, key, val);
      ob.dep.notify();
      return val
    }
```

### Vue.directive

```js

// 注册 (指令函数)
Vue.directive('my-directive', function () {
  // 这里将会被 `bind` 和 `update` 调用
})

var myDirective = Vue.directive('my-directive')

```

```js
var ASSET_TYPES = [
      'component',
      'directive',
      'filter'
];
  function initGlobalAPI (Vue) {
     //...
      initAssetRegisters(Vue);
  } 
  initGlobalAPI(Vue);

```

```js
function isPlainObject (obj) {
      return _toString.call(obj) === '[object Object]'
    }
   ASSET_TYPES.forEach(function (type) {
        Vue[type] = function (
          id,
          definition
        ) {
          //id->my-directive
          //definition -> cb
          if (!definition) {
            //拿到directive的cb
            return this.options[type + 's'][id]
          } else {
            /* istanbul ignore if */
            if (type === 'component') {
              //验证下component的名字
              validateComponentName(id);
            }
            //就是组件是不是个简单对象
            if (type === 'component' && isPlainObject(definition)) {、
              //简单对象构造成vue实例
              definition.name = definition.name || id;
              //_base是Vue构造函数对象用下面的extend方法来构造一个子类
              definition = this.options._base.extend(definition);
            }
            if (type === 'directive' && typeof definition === 'function') {
              //使用访问者模式在不同阶段都执行相同都definition
              definition = { bind: definition, update: definition };
            }
            //将指令保存在options/directives/my-directive -> fn
            this.options[type + 's'][id] = definition;
            //将访问对象返回出去
            return definition
          }
        };
      });
```

### Vue.filter

```js
//与directive执行一致
// 注册
Vue.filter('my-filter', function (value) {
  // 返回处理后的值
})

// getter，返回已注册的过滤器
var myFilter = Vue.filter('my-filter')
```

### Vue.component

```js
//directive共用一个方法
// 注册组件，传入一个扩展过的构造器
Vue.component('my-component', Vue.extend({ /* ... */ }))

// 注册组件，传入一个选项对象 (自动调用 Vue.extend)
Vue.component('my-component', { /* ... */ })

// 获取注册的组件 (始终返回构造器)
var MyComponent = Vue.component('my-component')
```

```js
  function initGlobalAPI (Vue) {
    //...
    initExtend(Vue);
  }
```

```js
function initExtend (Vue) {
  //...
   Vue.extend = function (extendOptions) {
        extendOptions = extendOptions || {};
        var Super = this;
        var SuperId = Super.cid;
        var cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {});
        if (cachedCtors[SuperId]) {
          return cachedCtors[SuperId]
        }
  
        var name = extendOptions.name || Super.options.name;
        if (name) {
          validateComponentName(name);
        }
  
        var Sub = function VueComponent (options) {
          this._init(options);
        };
        Sub.prototype = Object.create(Super.prototype);
        Sub.prototype.constructor = Sub;
        Sub.cid = cid++;
        Sub.options = mergeOptions(
          Super.options,
          extendOptions
        );
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
  
        // cache constructor
        cachedCtors[SuperId] = Sub;
        return Sub
      };
}
```

### Vue.use

```js
const MyPlugin = {}
MyPlugin.install = function (Vue, options) {
  // 1. 添加全局方法或属性
  Vue.myGlobalMethod = function () {
    // 逻辑...
  }

  // 2. 添加全局资源
  Vue.directive('my-directive', {
    bind (el, binding, vnode, oldVnode) {
      // 逻辑...
    }
    ...
  })

  // 3. 注入组件选项
  Vue.mixin({
    created: function () {
      // 逻辑...
    }
    ...
  })

  // 4. 添加实例方法
  Vue.prototype.$myMethod = function (methodOptions) {
    // 逻辑...
  }
}

// 调用 `MyPlugin.install(Vue)`
Vue.use(MyPlugin)

```

```js
    function initGlobalAPI (Vue) {
      //...
        initUse(Vue);
    }

    function toArray (list, start) {
      start = start || 0;
      var i = list.length - start;
      var ret = new Array(i);
      while (i--) {
        ret[i] = list[i + start];
      }
      return ret
    }

    function initUse (Vue) {
      Vue.use = function (plugin) {
        var installedPlugins = (this._installedPlugins || (this._installedPlugins = []));
            //先把原来的插件检查下有没有和现在要下载的插件冲不冲突
        if (installedPlugins.indexOf(plugin) > -1) {
          return this
        }
  
        // additional parameters
        //把参数转数组
        var args = toArray(arguments, 1);
        //把vue构造函数加进去
        args.unshift(this);
        if (typeof plugin.install === 'function') {
          //调用插件，把构造函数传进去
          plugin.install.apply(plugin, args);
        } else if (typeof plugin === 'function') {
          plugin.apply(null, args);
        }
        //执行完插件后把插件存起来
        installedPlugins.push(plugin);
        return this
      };
    }
```

### Vue.mixin

```js

// 为自定义的选项 'myOption' 注入一个处理器。
Vue.mixin({
  created: function () {
    var myOption = this.$options.myOption
    if (myOption) {
      console.log(myOption)
    }
  }
})

new Vue({
  myOption: 'hello!'
})
// => "hello!"
```

```js
 function initGlobalAPI (Vue) {
      //...
      initMixin$1(Vue);
 }

 function initMixin$1 (Vue) {
      Vue.mixin = function (mixin) {
        this.options = mergeOptions(this.options, mixin);
        return this
      };
 }
```

### Vue.compile

```js
var res = Vue.compile('<div><span>{{ msg }}</span></div>')

new Vue({
  data: {
    msg: 'hello'
  },
  render: res.render,
  staticRenderFns: res.staticRenderFns
})
```

```js

   function createCompileToFunctionFn (compile) {
      var cache = Object.create(null);
  
      return function compileToFunctions (
        template,
        options,
        vm
      ) {
        options = extend({}, options);
        var warn$$1 = options.warn || warn;
        delete options.warn;
  
        /* istanbul ignore if */
        {
          // detect possible CSP restriction
          try {
            new Function('return 1');
          } catch (e) {
            if (e.toString().match(/unsafe-eval|CSP/)) {
              warn$$1(
                'It seems you are using the standalone build of Vue.js in an ' +
                'environment with Content Security Policy that prohibits unsafe-eval. ' +
                'The template compiler cannot work in this environment. Consider ' +
                'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
                'templates into render functions.'
              );
            }
          }
        }
  
        // check cache
        var key = options.delimiters
          ? String(options.delimiters) + template
          : template;
        if (cache[key]) {
          return cache[key]
        }
  
        // 开始编译，把模版和options传进去
        var compiled = compile(template, options);
  
        // check compilation errors/tips
        {
          if (compiled.errors && compiled.errors.length) {
            if (options.outputSourceRange) {
              compiled.errors.forEach(function (e) {
                warn$$1(
                  "Error compiling template:\n\n" + (e.msg) + "\n\n" +
                  generateCodeFrame(template, e.start, e.end),
                  vm
                );
              });
            } else {
              warn$$1(
                "Error compiling template:\n\n" + template + "\n\n" +
                compiled.errors.map(function (e) { return ("- " + e); }).join('\n') + '\n',
                vm
              );
            }
          }
          if (compiled.tips && compiled.tips.length) {
            if (options.outputSourceRange) {
              compiled.tips.forEach(function (e) { return tip(e.msg, vm); });
            } else {
              compiled.tips.forEach(function (msg) { return tip(msg, vm); });
            }
          }
        }
  
        // turn code into functions
        var res = {};
        var fnGenErrors = [];
        res.render = createFunction(compiled.render, fnGenErrors);
        res.staticRenderFns = compiled.staticRenderFns.map(function (code) {
          return createFunction(code, fnGenErrors)
        });
  
        // check function generation errors.
        // this should only happen if there is a bug in the compiler itself.
        // mostly for codegen development use
        /* istanbul ignore if */
        {
          if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
            warn$$1(
              "Failed to generate render function:\n\n" +
              fnGenErrors.map(function (ref) {
                var err = ref.err;
                var code = ref.code;
  
                return ((err.toString()) + " in\n\n" + code + "\n");
            }).join('\n'),
              vm
            );
          }
        }
  
        return (cache[key] = res)
      }
    }

   function createCompilerCreator (baseCompile) {
      return function createCompiler (baseOptions) {
        function compile (
          template,
          options
        ) {
          var finalOptions = Object.create(baseOptions);
          var errors = [];
          var tips = [];
  
          var warn = function (msg, range, tip) {
            (tip ? tips : errors).push(msg);
          };
  
          if (options) {
            if (options.outputSourceRange) {
              // $flow-disable-line
              var leadingSpaceLength = template.match(/^\s*/)[0].length;
  
              warn = function (msg, range, tip) {
                var data = { msg: msg };
                if (range) {
                  if (range.start != null) {
                    data.start = range.start + leadingSpaceLength;
                  }
                  if (range.end != null) {
                    data.end = range.end + leadingSpaceLength;
                  }
                }
                (tip ? tips : errors).push(data);
              };
            }
            // merge custom modules
            if (options.modules) {
              finalOptions.modules =
                (baseOptions.modules || []).concat(options.modules);
            }
            // merge custom directives
            if (options.directives) {
              finalOptions.directives = extend(
                Object.create(baseOptions.directives || null),
                options.directives
              );
            }
            // copy other options
            for (var key in options) {
              if (key !== 'modules' && key !== 'directives') {
                finalOptions[key] = options[key];
              }
            }
          }
  
          finalOptions.warn = warn;
  
          var compiled = baseCompile(template.trim(), finalOptions);
          {
            detectErrors(compiled.ast, warn);
          }
          compiled.errors = errors;
          compiled.tips = tips;
          return compiled
        }
  
        return {
          compile: compile, //返回compile
          compileToFunctions: createCompileToFunctionFn(compile)//返回compilerToFunctions
        }
      }
    }

  var createCompiler = createCompilerCreator(function baseCompile (
      template,
      options
    ) {
      var ast = parse(template.trim(), options);
      if (options.optimize !== false) {
        optimize(ast, options);
      }
      var code = generate(ast, options);
      return {
        ast: ast,
        render: code.render,
        staticRenderFns: code.staticRenderFns
      }
    });

       function parse (
      template,
      options
    ) {
      warn$2 = options.warn || baseWarn;
  
      platformIsPreTag = options.isPreTag || no;
      platformMustUseProp = options.mustUseProp || no;
      platformGetTagNamespace = options.getTagNamespace || no;
      var isReservedTag = options.isReservedTag || no;
      maybeComponent = function (el) { return !!el.component || !isReservedTag(el.tag); };
  
      transforms = pluckModuleFunction(options.modules, 'transformNode');
      preTransforms = pluckModuleFunction(options.modules, 'preTransformNode');
      postTransforms = pluckModuleFunction(options.modules, 'postTransformNode');
  
      delimiters = options.delimiters;
  
      var stack = [];
      var preserveWhitespace = options.preserveWhitespace !== false;
      var whitespaceOption = options.whitespace;
      var root;
      var currentParent;
      var inVPre = false;
      var inPre = false;
      var warned = false;
  
      function warnOnce (msg, range) {
        if (!warned) {
          warned = true;
          warn$2(msg, range);
        }
      }
  
      function closeElement (element) {
        trimEndingWhitespace(element);
        if (!inVPre && !element.processed) {
          element = processElement(element, options);
        }
        // tree management
        if (!stack.length && element !== root) {
          // allow root elements with v-if, v-else-if and v-else
          if (root.if && (element.elseif || element.else)) {
            {
              checkRootConstraints(element);
            }
            addIfCondition(root, {
              exp: element.elseif,
              block: element
            });
          } else {
            warnOnce(
              "Component template should contain exactly one root element. " +
              "If you are using v-if on multiple elements, " +
              "use v-else-if to chain them instead.",
              { start: element.start }
            );
          }
        }
        if (currentParent && !element.forbidden) {
          if (element.elseif || element.else) {
            processIfConditions(element, currentParent);
          } else {
            if (element.slotScope) {
              // scoped slot
              // keep it in the children list so that v-else(-if) conditions can
              // find it as the prev node.
              var name = element.slotTarget || '"default"'
              ;(currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element;
            }
            currentParent.children.push(element);
            element.parent = currentParent;
          }
        }
  
        // final children cleanup
        // filter out scoped slots
        element.children = element.children.filter(function (c) { return !(c).slotScope; });
        // remove trailing whitespace node again
        trimEndingWhitespace(element);
  
        // check pre state
        if (element.pre) {
          inVPre = false;
        }
        if (platformIsPreTag(element.tag)) {
          inPre = false;
        }
        // apply post-transforms
        for (var i = 0; i < postTransforms.length; i++) {
          postTransforms[i](element, options);
        }
      }
  
      function trimEndingWhitespace (el) {
        // remove trailing whitespace node
        if (!inPre) {
          var lastNode;
          while (
            (lastNode = el.children[el.children.length - 1]) &&
            lastNode.type === 3 &&
            lastNode.text === ' '
          ) {
            el.children.pop();
          }
        }
      }
  
      function checkRootConstraints (el) {
        if (el.tag === 'slot' || el.tag === 'template') {
          warnOnce(
            "Cannot use <" + (el.tag) + "> as component root element because it may " +
            'contain multiple nodes.',
            { start: el.start }
          );
        }
        if (el.attrsMap.hasOwnProperty('v-for')) {
          warnOnce(
            'Cannot use v-for on stateful component root element because ' +
            'it renders multiple elements.',
            el.rawAttrsMap['v-for']
          );
        }
      }
  
      parseHTML(template, {
        warn: warn$2,
        expectHTML: options.expectHTML,
        isUnaryTag: options.isUnaryTag,
        canBeLeftOpenTag: options.canBeLeftOpenTag,
        shouldDecodeNewlines: options.shouldDecodeNewlines,
        shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
        shouldKeepComment: options.comments,
        outputSourceRange: options.outputSourceRange,
        start: function start (tag, attrs, unary, start$1, end) {
          // check namespace.
          // inherit parent ns if there is one
          var ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag);
  
          // handle IE svg bug
          /* istanbul ignore if */
          if (isIE && ns === 'svg') {
            attrs = guardIESVGBug(attrs);
          }
  
          var element = createASTElement(tag, attrs, currentParent);
          if (ns) {
            element.ns = ns;
          }
  
          {
            if (options.outputSourceRange) {
              element.start = start$1;
              element.end = end;
              element.rawAttrsMap = element.attrsList.reduce(function (cumulated, attr) {
                cumulated[attr.name] = attr;
                return cumulated
              }, {});
            }
            attrs.forEach(function (attr) {
              if (invalidAttributeRE.test(attr.name)) {
                warn$2(
                  "Invalid dynamic argument expression: attribute names cannot contain " +
                  "spaces, quotes, <, >, / or =.",
                  {
                    start: attr.start + attr.name.indexOf("["),
                    end: attr.start + attr.name.length
                  }
                );
              }
            });
          }
  
          if (isForbiddenTag(element) && !isServerRendering()) {
            element.forbidden = true;
            warn$2(
              'Templates should only be responsible for mapping the state to the ' +
              'UI. Avoid placing tags with side-effects in your templates, such as ' +
              "<" + tag + ">" + ', as they will not be parsed.',
              { start: element.start }
            );
          }
  
          // apply pre-transforms
          for (var i = 0; i < preTransforms.length; i++) {
            element = preTransforms[i](element, options) || element;
          }
  
          if (!inVPre) {
            processPre(element);
            if (element.pre) {
              inVPre = true;
            }
          }
          if (platformIsPreTag(element.tag)) {
            inPre = true;
          }
          if (inVPre) {
            processRawAttrs(element);
          } else if (!element.processed) {
            // structural directives
            processFor(element);
            processIf(element);
            processOnce(element);
          }
  
          if (!root) {
            root = element;
            {
              checkRootConstraints(root);
            }
          }
  
          if (!unary) {
            currentParent = element;
            stack.push(element);
          } else {
            closeElement(element);
          }
        },
  
        end: function end (tag, start, end$1) {
          var element = stack[stack.length - 1];
          // pop stack
          stack.length -= 1;
          currentParent = stack[stack.length - 1];
          if (options.outputSourceRange) {
            element.end = end$1;
          }
          closeElement(element);
        },
  
        chars: function chars (text, start, end) {
          if (!currentParent) {
            {
              if (text === template) {
                warnOnce(
                  'Component template requires a root element, rather than just text.',
                  { start: start }
                );
              } else if ((text = text.trim())) {
                warnOnce(
                  ("text \"" + text + "\" outside root element will be ignored."),
                  { start: start }
                );
              }
            }
            return
          }
          // IE textarea placeholder bug
          /* istanbul ignore if */
          if (isIE &&
            currentParent.tag === 'textarea' &&
            currentParent.attrsMap.placeholder === text
          ) {
            return
          }
          var children = currentParent.children;
          if (inPre || text.trim()) {
            text = isTextTag(currentParent) ? text : decodeHTMLCached(text);
          } else if (!children.length) {
            // remove the whitespace-only node right after an opening tag
            text = '';
          } else if (whitespaceOption) {
            if (whitespaceOption === 'condense') {
              // in condense mode, remove the whitespace node if it contains
              // line break, otherwise condense to a single space
              text = lineBreakRE.test(text) ? '' : ' ';
            } else {
              text = ' ';
            }
          } else {
            text = preserveWhitespace ? ' ' : '';
          }
          if (text) {
            if (!inPre && whitespaceOption === 'condense') {
              // condense consecutive whitespaces into single space
              text = text.replace(whitespaceRE$1, ' ');
            }
            var res;
            var child;
            if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
              child = {
                type: 2,
                expression: res.expression,
                tokens: res.tokens,
                text: text
              };
            } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
              child = {
                type: 3,
                text: text
              };
            }
            if (child) {
              if (options.outputSourceRange) {
                child.start = start;
                child.end = end;
              }
              children.push(child);
            }
          }
        },
        comment: function comment (text, start, end) {
          // adding anyting as a sibling to the root node is forbidden
          // comments should still be allowed, but ignored
          if (currentParent) {
            var child = {
              type: 3,
              text: text,
              isComment: true
            };
            if (options.outputSourceRange) {
              child.start = start;
              child.end = end;
            }
            currentParent.children.push(child);
          }
        }
      });
      return root
    }
  

 var ref$1 = createCompiler(baseOptions);
 var compile = ref$1.compile;
 var compileToFunctions = ref$1.compileToFunctions;

 Vue.compile = compileToFunctions;

 
```

### Vue.observable

```js
const state = Vue.observable({ count: 0 })

const Demo = {
  render(h) {
    return h('button', {
      on: { click: () => { state.count++ }}
    }, `count is: ${state.count}`)
  }
}
```

```js
function initGlobalAPI (Vue) {
  //...
    Vue.observable = function (obj) {
        observe(obj);
        return obj
    };
  
}

function isObject (obj) {
    return obj !== null && typeof obj === 'object'
}
var hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn (obj, key) {
  return hasOwnProperty.call(obj, key)
}

function isPlainObject (obj) {
  return _toString.call(obj) === '[object Object]'
}
  var Observer = function Observer (value) {
      this.value = value;
      this.dep = new Dep();
      this.vmCount = 0;
      def(value, '__ob__', this);
      if (Array.isArray(value)) {
        if (hasProto) {
          protoAugment(value, arrayMethods);
        } else {
          copyAugment(value, arrayMethods, arrayKeys);
        }
        this.observeArray(value);
      } else {
        this.walk(value);
      }
    };

function observe (value, asRootData) {
      //判断是不是一个对象或者一个vnode节点
      if (!isObject(value) || value instanceof VNode) {
        return
      }
      var ob;
      //判断有没有__ob__就是判断是不是响应式对象
      if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
        ob = value.__ob__;
      } else if (
        shouldObserve &&
        !isServerRendering() &&
        (Array.isArray(value) || isPlainObject(value)) &&
        Object.isExtensible(value) &&
        !value._isVue
      ) {
        //开始将普通对象转换为响应对象
        ob = new Observer(value);
      }
      if (asRootData && ob) {
        ob.vmCount++;
      }
      return ob
    }
  
```