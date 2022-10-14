import StreamersType from '@/types/streamers-type';
import UserType from '@/types/user-type';
import { partition, processStorage } from './utils/utils';

browser.alarms.create({ periodInMinutes: 0.25 });

const clientId = process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID;
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function getBrowserAction(): any {
  if (browser.browserAction) {
    return browser.browserAction;
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return browser.action;
}

function generateState() {
  let value = '';
  for (let i = 0; i < 50; i += 1) {
    value += chars.charAt(Math.floor(Math.random()
      * chars.length));
  }
  return value;
}

async function authHandler() {
  const state = generateState();
  const request = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(browser.identity.getRedirectURL())}&response_type=token&state=${state}&force_verify=true&scope=user%3Aread%3Afollows%20user%3Aread%3Aemail`;
  const response = await browser.identity.launchWebAuthFlow({
    url: request,
    interactive: true,
  });

  const urlObj = new URL(response.replace('#', '?'));
  if (urlObj.searchParams.get('state') !== state) throw new Error('State incorrect');

  const accessToken = urlObj.searchParams.get('access_token');
  if (!accessToken) throw new Error('Token not found');

  browser.storage.sync.set({ accessToken }).then();

  return accessToken;
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.type) {
    case 'AUTH':
      return authHandler();
    default:
      break;
  }
  return true;
});

let loadingFollow = false;
let first = true;
let onlines: StreamersType[] = [];

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

async function processNotifications(news: StreamersType[], accessToken: string) {
  const notificationType = await processStorage('notification');
  if (notificationType === 'none') return;

  let notificate: StreamersType[] = [];

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

const regexNotification = /^([a-zA-Z0-9]{50})-N-(.+)$/;
browser.notifications.onClicked.addListener((notificationId) => {
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
  const obj = await response.json();

  return obj.data[0].id;
}

async function getStreamersOnlineFollowed(userId: string, accessToken: string)
  : Promise<StreamersType[]> {
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
    const obj = await response.json();

    return {
      page: obj.pagination && obj.pagination.cursor,
      items: obj.data.map((value: any) => {
        const item: StreamersType = {
          id: value.user_id,
          online: true,
          login: value.user_login,
          nickname: value.user_name,
          startedAt: value.started_at,
          language: value.language,
          gameId: value.game_id,
          gameName: value.game_name,
          type: value.type,
          title: value.title,
          viewers: value.viewer_count,
          thumbnailUrl: value.thumbnail_url,
          tagIds: value.tag_ids,
          isMature: value.is_mature,
        };
        return item;
      }),
    };
  });
}

async function countFollows() {
  let count = 0;
  try {
    const value = await browser.storage.sync.get('accessToken');
    const accessToken = value && value.accessToken;
    if (loadingFollow || !accessToken) return;
    loadingFollow = true;
    const userId = await getSelfUserId(accessToken);
    const onlinesNews = await getStreamersOnlineFollowed(
      userId,
      accessToken,
    );
    if (!first) {
      await processNotifications(onlinesNews, accessToken);
    }

    onlines = onlinesNews;
    count = onlines.length;
  } finally {
    if (count > 99) {
      getBrowserAction().setBadgeText({ text: '99+' }).then();
    } else if (count > 0) {
      getBrowserAction().setBadgeText({ text: count.toString() }).then();
    } else {
      getBrowserAction().setBadgeText({ text: '' }).then();
    }
    loadingFollow = false;
    first = false;
  }
}

browser.alarms.onAlarm.addListener(countFollows);
setTimeout(countFollows, 1000);
