<template>
  <v-row no-gutters align="center" justify="center" class="flex-column fill-height">
    <v-col cols="auto">
      <v-icon size="150">mdi-account-hard-hat</v-icon>
    </v-col>
    <v-col cols="auto">
      <span>{{$t('under_construction')}}</span>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class UnderConstruction extends Vue {
}
</script>
