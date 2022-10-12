import moment from 'moment/moment';

declare module 'vue/types/vue' {
  // Global properties can be declared
  // on the `VueConstructor` interface
  interface VueConstructor {
    $moment: moment;
  }

  interface Vue {
    $moment: moment;
  }
}

// ComponentOptions is declared in types/options.d.ts
declare module 'vue/types/options' {
}
