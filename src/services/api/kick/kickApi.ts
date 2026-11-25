import KickApiChannelEndpoint from '@/services/api/kick/endpoints/kickApiChannelEndpoint'
import KickApiUserEndpoint from '@/services/api/kick/endpoints/kickApiUserEndpoint'

const KickApi = {
  channels: new KickApiChannelEndpoint(),
  users: new KickApiUserEndpoint(),
}

export default KickApi
