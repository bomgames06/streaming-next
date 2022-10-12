import { Moment } from 'moment';

type VideosType = {
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
  duration: string,
  mutedSegments: {
    duration: number,
    offset: number,
  }[]
}

export default VideosType;
