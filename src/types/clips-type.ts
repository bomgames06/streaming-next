import { Moment } from 'moment';

type ClipsType = {
  id: string,
  online: boolean,
  login: string,
  nickname: string,
  title: string,
  viewers: number,
  createdAt: Moment,
  language: string,
  url: string,
  thumbnailUrl: string,
  duration: number,
}

export default ClipsType;
