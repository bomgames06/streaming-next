<template>
  <v-row>
    <v-col cols="12" class="d-flex flex-wrap align-center text-subtitle-2">
      <span>{{$t('version')}}: {{$appVersion}}</span>
      <v-divider vertical class="mx-1" />
      <v-hover #default="{ hover }">
        <v-btn
          x-small
          text
          height="22"
          :color="hover ? 'twitter' : ''"
          class="px-1 text-subtitle-2 text-none letter-spacing-normal"
        >
          <v-icon small class="mr-1">
            mdi-twitter
          </v-icon>
          <span>
            Bomgames06
          </span>
        </v-btn>
      </v-hover>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class AboutMe extends Vue {
}
</script>
