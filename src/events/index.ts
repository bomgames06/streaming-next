import mitt from 'mitt'

type Events = {
  refresh: void
}

const emitter = mitt<Events>()

export default emitter
