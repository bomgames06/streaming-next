import Vue from 'vue';
import moment from 'moment';
import 'moment-duration-format';
import initPtBr from '@/moment/locales/pt-br';

Vue.use((VueObj): void => {
  initPtBr(moment);
  VueObj.prototype.$moment = moment;
  VueObj.$moment = moment;
});
