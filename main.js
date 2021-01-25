import Vue from 'vue'
import App from './App'
import http from './utils/http.js'
import delay from '@/utils/delay.js';
import moment from 'moment';
moment.locale('zh-cn');
Vue.config.productionTip = false
App.mpType = 'app'
Vue.prototype.$http = http
Vue.prototype.$delay = delay
Vue.prototype.$moment = moment

const app = new Vue({
    ...App
})
app.$mount()
