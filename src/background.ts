import StreamersType from '@/types/streamers-type';
import { processStorage } from './utils/utils';

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

function getStreamersHasLogin(item: StreamersType[]): StreamersType[] {
  return item.filter((value) => value.nickname);
}

async function processNotifications(news: StreamersType[]) {
  const notificationType = await processStorage('notification');
  if (notificationType === 'none') return;

  const newsLogin = getStreamersHasLogin(news);
  const onlinesLogin = getStreamersHasLogin(onlines);

  let notificate: StreamersType[] = [];

  if (notificationType === 'all') {
    notificate = newsLogin.filter((value) => !onlinesLogin
      .some((online) => online.id === value.id));
  }
  if (notificationType === 'partial') {
    const notificationIds = await processStorage('notificationIds') || [];
    notificate = newsLogin.filter((value) => notificationIds.includes(value.id)
      && !onlinesLogin.some((online) => online.id === value.id));
  }
  notificate.forEach((item) => {
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/128.png'),
      title: item.nickname,
      message: item.title || '',
    }).then();
  });
}

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
      await processNotifications(onlinesNews);
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
