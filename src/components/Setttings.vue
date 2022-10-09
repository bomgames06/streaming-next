<template>
  <v-container class="fill-height">
    <under-construction />
  </v-container>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import UnderConstruction from '@/components/UnderConstruction.vue';

@Component({
  components: { UnderConstruction },
})
export default class Setttings extends Vue {
}
</script>
