<template>
  <v-row>
    <v-col cols="12" class="d-flex flex-wrap align-center text-subtitle-2">
      <span class="mx-2">{{$t('version')}}: {{$appVersion}}</span>
      <v-divider vertical />
      <v-hover #default="{ hover }">
        <v-btn
          x-small
          text
          height="-webkit-fill-available"
          :color="hover ? 'twitter' : ''"
          class="mx-1 px-1 text-subtitle-2 text-none letter-spacing-normal"
          @click="openTwitter('bomgames06')"
        >
          <v-icon small class="mr-1">
            mdi-twitter
          </v-icon>
          <span>
            Bomgames06
          </span>
        </v-btn>
      </v-hover><v-divider vertical />
      <v-hover #default="{ hover }">
        <v-btn
          x-small
          text
          height="-webkit-fill-available"
          :color="hover ? 'red' : ''"
          class="mx-1 px-1 text-subtitle-2 text-none letter-spacing-normal"
          @click="openDonation()"
        >
          <v-icon small class="mr-1">
            mdi-heart
          </v-icon>
          <span>
            {{$t('donation')}}
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
  openTwitter(profile: string): void {
    window.open(`https://twitter.com/${profile}`, '_blank');
  }

  openDonation(): void {
    window.open('https://www.buymeacoffee.com/bomgames06', '_blank');
  }
}
</script>
