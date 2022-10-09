import Vue from 'vue';
import Vuex from 'vuex';
import AppStore from '@/store/modules/app-store';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    AppStore,
  },
});
