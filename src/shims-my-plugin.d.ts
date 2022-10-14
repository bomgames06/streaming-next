import moment from 'moment/moment';

declare module 'vue/types/vue' {
  // Global properties can be declared
  // on the `VueConstructor` interface
  interface VueConstructor {
    $moment: moment;
    $appVersion: string;
  }

  interface Vue {
    $moment: moment;
    $appVersion: string;
  }
}

// ComponentOptions is declared in types/options.d.ts
declare module 'vue/types/options' {
}
