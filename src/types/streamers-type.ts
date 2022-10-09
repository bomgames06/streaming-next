import { Moment } from 'moment';

type StreamersType = {
  id: string,
  online: boolean,
  login: string,
  nickname: string,
  gameId?: string,
  gameName?: string,
  type?: 'live' | '',
  title?: string,
  viewers?: number,
  startedAt?: Moment,
  language?: string,
  thumbnailUrl?: string,
  tagIds?: string[],
  isMature?: boolean,
  profileImage?: string,
}

export default StreamersType;
