import TwitchApiService from '@/services/twitch-api/twitch-api-service';
import StreamersType from '@/types/streamers-type';
import { processStorage } from '@/utils/utils';
import NotificationsType from '@/types/notifications-type';

browser.alarms.create({ periodInMinutes: 0.5 });

const clientId = process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID;
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

let accessToken: string | null;

browser.storage.local.get('accessToken').then((value) => {
  accessToken = value && value.accessToken;
});

function generateState(): string {
  let value = '';
  for (let i = 0; i < 50; i += 1) {
    value += chars.charAt(Math.floor(Math.random()
      * chars.length));
  }
  return value;
}

async function authHandler(): Promise<string> {
  const state = generateState();
  const request = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(browser.identity.getRedirectURL())}&response_type=token&state=${state}&force_verify=true&scope=user%3Aread%3Afollows%20user%3Aread%3Aemail`;
  const response = await browser.identity.launchWebAuthFlow({
    url: request,
    interactive: true,
  });

  const urlObj = new URL(response.replace('#', '?'));
  if (urlObj.searchParams.get('state') !== state) throw new Error('State incorrect');

  accessToken = urlObj.searchParams.get('access_token');
  if (!accessToken) throw new Error('Token not found');

  browser.storage.local.set({ accessToken }).then();

  return accessToken;
}

function badgeHandler(message: any): boolean {
  browser.browserAction.setBadgeText({ text: message.badge }).then();
  return true;
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.type) {
    case 'AUTH':
      return authHandler();
    case 'BADGE':
      return badgeHandler(message);
    default:
      break;
  }
  return true;
});

let loadingFollow = false;
let first = true;
let onlines: StreamersType[] = [];

async function processNotifications(news: StreamersType[]) {
  let notificate: StreamersType[] = [];
  const notificationType: NotificationsType = await processStorage('notification');
  if (notificationType === 'all') {
    notificate = news.filter((value) => !onlines.some((online) => online.id === value.id));
  }
  if (notificationType === 'partial') {
    const notificationIds = await processStorage('notificationIds') || [];
    notificate = news.filter((value) => notificationIds.includes(value.id)
      && !onlines.some((online) => online.id === value.id));
  }
  notificate.forEach((item) => {
    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/128.png'),
      title: item.nickname,
      message: item.title || '',
    })
      .then();
  });
}

async function countFollows() {
  let count = 0;
  try {
    if (loadingFollow || !accessToken) return;
    loadingFollow = true;
    const user = await TwitchApiService.users.getSelfUser(accessToken);
    const onlinesNews = await TwitchApiService.streamers.getStreamersOnlineFollowed(
      user.id,
      accessToken,
    );
    if (!first) {
      await processNotifications(onlinesNews);
    }

    onlines = onlinesNews;
    count = onlines.length;
  } finally {
    if (count > 0) {
      browser.browserAction.setBadgeText({ text: count.toString() }).then();
    } else {
      browser.browserAction.setBadgeText({ text: '' }).then();
    }
    loadingFollow = false;
    first = false;
  }
}

browser.alarms.onAlarm.addListener(countFollows);
setTimeout(countFollows, 1000);
