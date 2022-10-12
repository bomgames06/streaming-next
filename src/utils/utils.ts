import { Framework } from 'vuetify';
import Vue from 'vue';
import moment from 'moment';

export function changeTheme(vuetify: Framework): void {
  vuetify.theme.dark = !vuetify.theme.dark;
  browser.storage.local.set({ dark: vuetify.theme.dark }).then();
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

export async function processStorage(key: string): Promise<any> {
  const storage = await browser.storage.local.get(key);
  if (storage) return storage[key];
  return null;
}

export function getDurationVod(durationStr: string): moment.Duration {
  const matches = durationStr.matchAll(/((\d+)h)|((\d+)m)|((\d+)s)/g);
  const duration = Vue.prototype.$moment.duration();
  [...matches].forEach((value: RegExpMatchArray) => {
    if (value[2] != null) {
      duration.add(value[2], 'h');
    }
    if (value[4] != null) {
      duration.add(value[4], 'm');
    }
    if (value[6] != null) {
      duration.add(value[6], 's');
    }
  });

  return duration;
}
