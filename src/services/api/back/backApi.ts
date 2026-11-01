import BackTokenEndpoint from '@/services/api/back/endpoints/backTokenEndpoint'

const BackApi = {
  tokens: {
    twitch: new BackTokenEndpoint('twitch'),
    youtube: new BackTokenEndpoint('youtube'),
    kick: new BackTokenEndpoint('kick'),
  },
}

export default BackApi
