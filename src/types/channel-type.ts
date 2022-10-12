import { Moment } from 'moment';

type ChannelType = {
  id: string,
  online: boolean,
  login: string,
  nickname: string,
  gameId: string,
  gameName: string,
  title: string,
  startedAt?: Moment,
  language: string,
  thumbnailUrl: string,
  tagIds: string[],
}

export default ChannelType;
