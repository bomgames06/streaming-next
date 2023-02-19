import UserType from '@/types/user-type';
import { partition, processStorage } from './utils/utils';

browser.alarms.create({ periodInMinutes: 1 });

const clientId = process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID;

function generateState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let i = 0; i < 50; i += 1) {
    value += chars.charAt(Math.floor(Math.random()
      * chars.length));
  }
  return value;
}

function getBrowserAction(): any {
  if (browser.browserAction) {
    return browser.browserAction;
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return browser.action;
}

function getSessionStorage(): any {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return browser.storage.session;
}

async function processStorageSession(key: string): Promise<any> {
  const storage = await getSessionStorage().get(key);
  if (storage) return storage[key];
  return null;
}

async function expiredTokenHandler() {
  getBrowserAction().setBadgeBackgroundColor({
    color: 'red',
  }).then();
  getBrowserAction().setBadgeText({ text: '!' }).then();
}

async function badgeCountHandler(value: number) {
  if (value > 99) {
    getBrowserAction().setBadgeText({ text: '99+' }).then();
  } else if (value > 0) {
    getBrowserAction().setBadgeText({ text: value.toString() }).then();
  } else {
    getBrowserAction().setBadgeText({ text: '' }).then();
  }
}

async function getUsers(userIds: string[], accessToken?: string): Promise<UserType[]> {
  const paritionValues = partition(userIds, 100);
  const values: UserType[] = [];

  const promises: any[] = [];
  paritionValues.forEach((ids) => {
    promises.push((async (): Promise<UserType[]> => {
      const url = new URL('https://api.twitch.tv/helix/users');
      ids.forEach((value) => url.searchParams.append('id', value));

      const response = await fetch(url.toString(), {
        headers: {
          'Client-ID': process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.status === 401) throw Error('HTTP_401');
      const obj = await response.json();

      return obj.data.map((value: any): UserType => ({
        id: value.id,
        login: value.login,
        nickname: value.display_name,
        avatar: value.profile_image_url,
      }));
    })());
  });

  const responses = await Promise.all(promises);
  responses.forEach((value) => values.push(...value));

  return values;
}

async function processNotifications(onlines: any[], news: any[], accessToken: string) {
  const notificationType = await processStorage('notification');
  if (notificationType === 'none') return;

  let notificate: any[] = [];

  if (notificationType === 'all') {
    notificate = news.filter((value) => !onlines
      .some((online) => online.id === value.id));
  }
  if (notificationType === 'partial') {
    const notificationIds = await processStorage('notificationIds') || [];
    notificate = news.filter((value) => notificationIds.includes(value.id)
      && !onlines.some((online) => online.id === value.id));
  }
  if (!notificate.length) return;

  const ids = notificate.map((value) => value.id);
  const users = await getUsers(ids, accessToken);

  notificate.forEach((item) => {
    const user = users.find((value) => value.id === item.id);
    if (!user) return;
    browser.notifications.create(`${generateState()}-N-${user.login}`, {
      type: 'basic',
      iconUrl: user.avatar,
      title: user.nickname,
      message: item.title || '',
    }).then();
  });
}

browser.notifications.onClicked.addListener((notificationId) => {
  const regexNotification = /^([a-zA-Z0-9]{50})-N-(.+)$/;
  if (regexNotification.test(notificationId)) {
    const match = notificationId.match(regexNotification);
    if (!match || !match[2]) return;
    browser.tabs.create({ url: `https://www.twitch.tv/${match[2]}` }).then();
  }
});

async function fetchAll<T>(handler: (page: string) => Promise<{ page: string, items: T[] }>)
  : Promise<T[]> {
  const list: T[] = [];
  let fetch: any;

  let page = null;
  do {
    fetch = await handler(page);
    page = fetch.page;
    list.push(...fetch.items);
  } while (page);

  return list;
}

async function getSelfUserId(accessToken: string): Promise<string> {
  const response = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'GET',
  });
  if (response.status === 401) throw Error('HTTP_401');
  const obj = await response.json();

  return obj.data[0].id;
}

async function getStreamersOnlineFollowed(userId: string, accessToken: string)
  : Promise<any[]> {
  return fetchAll(async (page) => {
    const url = new URL('https://api.twitch.tv/helix/streams/followed');
    url.searchParams.append('user_id', userId);
    if (page) {
      url.searchParams.append('after', page);
    }
    const response = await fetch(url.toString(), {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });
    if (response.status === 401) throw Error('HTTP_401');
    const obj = await response.json();

    return {
      page: obj.pagination && obj.pagination.cursor,
      items: obj.data.map((value: any) => ({
        id: value.user_id,
        title: value.title,
      })),
    };
  });
}

async function countFollows() {
  let count = 0;
  try {
    const accessToken = await processStorage('accessToken');
    if (!accessToken) {
      const expiredToken = await processStorage('expiredToken');
      if (expiredToken) {
        expiredTokenHandler().then();
      } else {
        getBrowserAction().setBadgeText({ text: '' }).then();
      }
      return;
    }

    const loadingFollow = await processStorageSession('loadingFollow');
    if (loadingFollow) return;
    await getSessionStorage().set({ loadingFollow: true });

    const userId = await getSelfUserId(accessToken);
    const onlinesNews = await getStreamersOnlineFollowed(
      userId,
      accessToken,
    );
    const started = await processStorageSession('started');
    if (started) {
      const onlines = await processStorageSession('onlines') || [];
      await processNotifications(onlines, onlinesNews, accessToken);
    }

    await getSessionStorage().set({ onlines: onlinesNews });
    count = onlinesNews.length;
    getBrowserAction().setBadgeBackgroundColor({
      color: '#660099',
    }).then();
    badgeCountHandler(count).then();
  } catch (error: any) {
    if (error.message === 'HTTP_401') {
      browser.storage.sync.set({ accessToken: '' }).then();
      browser.storage.sync.set({ expiredToken: true }).then();
      expiredTokenHandler().then();
    }
  } finally {
    await getSessionStorage().set({ loadingFollow: false });
    await getSessionStorage().set({ started: true });
  }
}

async function startHandler() {
  const expiredToken = await processStorage('expiredToken');
  if (expiredToken) {
    expiredTokenHandler().then();
  }
}

async function authHandler() {
  const state = generateState();
  const request = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(browser.identity.getRedirectURL())}&response_type=token&state=${state}&force_verify=false&scope=user%3Aread%3Afollows%20user%3Aread%3Aemail`;
  const response = await browser.identity.launchWebAuthFlow({
    url: request,
    interactive: true,
  });

  const urlObj = new URL(response.replace('#', '?'));
  if (urlObj.searchParams.get('state') !== state) throw new Error('State incorrect');

  const accessToken = urlObj.searchParams.get('access_token');
  if (!accessToken) throw new Error('Token not found');

  browser.storage.sync.set({ notificationIds: [] }).then();
  await getSessionStorage().set({ onlines: [] });
  await getSessionStorage().set({ started: false });
  browser.storage.sync.set({ accessToken }).then();
  browser.storage.sync.set({ expiredToken: false }).then();
  countFollows().then();

  return accessToken;
}

async function revokeHandler(accessToken?: string) {
  if (!accessToken) return true;
  const request = `https://id.twitch.tv/oauth2/revoke?client_id=${clientId}&token=${accessToken}`;
  await fetch(request, {
    method: 'POST',
  });

  browser.storage.sync.set({ accessToken: null }).then();
  browser.storage.sync.set({ notificationIds: [] }).then();
  await getSessionStorage().set({ started: false });
  await getSessionStorage().set({ onlines: [] });
  countFollows().then();

  return true;
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.type) {
    case 'AUTH':
      return authHandler();
    case 'START':
      return startHandler();
    case 'EXPIRED_TOKEN':
      return expiredTokenHandler();
    case 'BADGE_COUNT':
      return badgeCountHandler(message.value);
    case 'REVOKE':
      return revokeHandler(message.accessToken);
    default:
      break;
  }
  return true;
});

browser.alarms.onAlarm.addListener(countFollows);

getBrowserAction().setBadgeBackgroundColor({
  color: '#660099',
});
if (getBrowserAction().setBadgeTextColor) {
  getBrowserAction().setBadgeTextColor({
    color: '#FFFFFF',
  });
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
browser.runtime.onStartup.addListener(() => {});

processStorageSession('started').then((value: any) => {
  if (!value) countFollows().then();
});
