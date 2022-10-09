const clientId = process.env.VUE_APP_OAUTH2_TWITCH_CLIENTID;
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

let at;

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

  const accessToken = urlObj.searchParams.get('access_token');
  if (!accessToken) throw new Error('Token not found');

  at = accessToken;

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
