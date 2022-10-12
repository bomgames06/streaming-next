<template>
  <v-row no-gutters align="center" justify="center" class="flex-column fill-height">
    <v-col cols="auto">
      <v-icon size="150">mdi-account-lock</v-icon>
    </v-col>
    <v-col cols="auto">
      <span>{{$t('necessary_authentication_message')}}</span>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class ErroNeedAuth extends Vue {
}
</script>
