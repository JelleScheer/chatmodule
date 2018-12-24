
/**
 * First we will load all of this project's JavaScript dependencies which
 * includes Vue and other libraries. It is a great starting point when
 * building robust, powerful web applications using Vue and Laravel.
 */

require('./bootstrap');

window.Vue = require('vue');
import store from './lib/Store.js';
import "@fortawesome/fontawesome-pro/css/all.css"
import ActiveData from './lib/ActiveData-v0.3.1'

/**
 * The following block of code may be used to automatically register your
 * Vue components. It will recursively scan this directory for the Vue
 * components and automatically register them with their "basename".
 *
 * Eg. ./components/ExampleComponent.vue -> <example-component></example-component>
 */

const files = require.context('./', true, /\.vue$/i)
files.keys().map(key => Vue.component(key.split('/').pop().split('.')[0], files(key)))

Vue.component('chats', require('./components/Chats.vue'));
Vue.component('chat', require('./components/Chat.vue'));

/**
 * Next, we will create a fresh Vue application instance and attach it to
 * the page. Then, you may begin adding components to this application
 * or customize the JavaScript scaffolding to fit your unique needs.
 */

require('./models/Chat');
require('./models/Message');

Vue.config.productionTip = false;
Vue.config.devtools = false;
Vue.config.debug = false;
Vue.config.silent = true;

window.pluralize = require('pluralize');

window.Store = store;
ActiveDataStore = new ActiveDataStore();

const app = new Vue({
    el: '#app',
    store,

    mounted() {
        this.$store.dispatch('getUser');

        /*
        let response = {
            data: [
                {
                    id: 1,
                    body: 'test',
                    chat_id: 5,
                }
            ]
        };

        var data_models = [
            {
                model: 'Message',
                source: 'data',
            },
        ];

        ActiveDataStore.activeDataSetup(data_models, response);

        let response2 = {
            data: [
                {
                    id: 5,
                    name: 'testchat',
                }
            ]
        };

        var data_models2 = [
            {
                model: 'Chat',
                source: 'data',
            },
        ];

        ActiveDataStore.activeDataSetup(data_models2, response2);
        */
    }
});
