import { Framework } from 'vuetify';
import Vue from 'vue';

export function changeTheme(vuetify: Framework): void {
  // eslint-disable-next-line no-param-reassign
  vuetify.theme.dark = !vuetify.theme.dark;
  Vue.$cookies.set('dark', vuetify.theme.dark);
}

export function partition<T>(collection: T[], amount: number): T[][] {
  const value: T[][] = [];
  let partitionValue = collection;
  do {
    value.push(partitionValue.slice(0, amount));
    partitionValue = partitionValue.slice(amount);
  } while (partitionValue.length > 0);

  return value;
}

export function processCookie(cookie: string): string | null {
  if (cookie && cookie !== 'null') return cookie;
  return null;
}
