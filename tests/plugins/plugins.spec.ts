import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { AxiosError, AxiosHeaders, HttpStatusCode } from 'axios'
import toastr from 'toastr'
import moment from 'moment'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import apiPlugin from '@/plugins/api'
import errorPlugin from '@/plugins/error'
import toastrPlugin from '@/plugins/toastr'
import momentPlugin from '@/plugins/moment'
import useMoment from '@/plugins/moment/useMoment'
import registerPlugins from '@/plugins'
import i18n from '@/plugins/i18n'
import pinia from '@/plugins/pinia'
import vuetify from '@/plugins/vuetify'
import emitter from '@/events'
import { emitResponseError, offResponseError, responseErrorHandlers } from '@/services/api/twitch/events/twitchApiEvent'
import useSystemStore from '@/store/system/useSystemStore'
import { account } from '@tests/__utils__/fixtures'
import { getTestPlugins } from '@tests/__utils__/util'

function axiosError(status: number, authorization?: string) {
  const config = { headers: new AxiosHeaders(authorization ? { Authorization: authorization } : {}) }
  return new AxiosError('error', 'ERR_BAD_REQUEST', config, undefined, {
    status,
    statusText: String(status),
    data: {},
    headers: {},
    config,
  })
}

describe('plugins', () => {
  afterEach(() => {
    // Keep only the handlers registered before the test
    responseErrorHandlers.slice(1).forEach(offResponseError)
  })

  describe('api', () => {
    it('Invalidate the account of a rejected token', async () => {
      setActivePinia(createPinia())
      const system = useSystemStore()
      system.accounts = { twitch: account({ token: 'abc' }) }
      const before = responseErrorHandlers.length
      createApp({}).use(apiPlugin)
      expect(responseErrorHandlers).toHaveLength(before + 1)
      const handler = responseErrorHandlers.at(-1)!

      await handler(axiosError(HttpStatusCode.InternalServerError, 'Bearer abc'))
      await handler(new Error('not axios'))
      expect(system.accounts.twitch!.invalid).toBe(false)

      // Without the token there is nothing to invalidate
      await handler(axiosError(HttpStatusCode.Unauthorized))
      expect(system.accounts.twitch!.invalid).toBe(false)

      await handler(axiosError(HttpStatusCode.Unauthorized, 'Bearer abc'))
      expect(system.accounts.twitch!.invalid).toBe(true)

      offResponseError(handler)
    })
    it('Rethrow when no store is available', async () => {
      createApp({}).use(apiPlugin)
      const handler = responseErrorHandlers.at(-1)!
      const error = axiosError(HttpStatusCode.Unauthorized)
      // Outside a pinia context useSystemStore throws
      setActivePinia(undefined)

      await expect(async () => handler(error)).rejects.toBe(error)

      offResponseError(handler)
    })
  })

  describe('error', () => {
    function installHandler() {
      const app = createApp({})
      app.use(i18n).use(errorPlugin)
      return app.config.errorHandler!
    }

    it('Show the unauthorized message and rethrow', () => {
      const errorSpy = vi.spyOn(toastr, 'error').mockReturnValue(undefined as never)
      const handler = installHandler()
      const error = axiosError(HttpStatusCode.Unauthorized)

      expect(() => handler(error, null, '')).toThrow(error)
      expect(errorSpy).toHaveBeenCalledWith(i18n.global.t('common.unauthorizedAccount'))
    })
    it('Show the system error message for any other error', () => {
      const errorSpy = vi.spyOn(toastr, 'error').mockReturnValue(undefined as never)
      const handler = installHandler()

      expect(() => handler(axiosError(HttpStatusCode.BadRequest), null, '')).toThrow()
      expect(() => handler(new Error('boom'), null, '')).toThrow('boom')
      expect(errorSpy).toHaveBeenCalledTimes(2)
      expect(errorSpy).toHaveBeenCalledWith(i18n.global.t('common.systemError'))
    })
  })

  describe('toastr', () => {
    it('Configure the toast options', () => {
      createApp({}).use(toastrPlugin)

      expect(toastr.options).toMatchObject({
        progressBar: true,
        timeOut: 3000,
        extendedTimeOut: 3000,
        target: '#toastr-content',
      })
    })
  })

  describe('moment', () => {
    it('Enable duration format with the pt-BR labels', () => {
      createApp({}).use(momentPlugin)

      expect(moment.duration(3723, 'seconds').format('hh:mm:ss', { trim: false })).toBe('01:02:03')
      moment.locale('pt-br')
      expect(moment.duration(1, 'days').format('d __')).toBe('1 dia')
      expect(moment.duration(2, 'hours').format('h __')).toBe('2 horas')
      expect(moment.duration(5, 'minutes').format('m _')).toBe('5 mins')
      moment.locale('en')
    })
    it('Follow the i18n locale', () => {
      let value: ReturnType<typeof useMoment> | undefined
      mount(
        defineComponent({
          setup() {
            value = useMoment()
            return () => h('span')
          },
        }),
        { global: { plugins: getTestPlugins() } }
      )
      expect(value!.value.locale()).toBe('en')

      i18n.global.locale.value = 'pt-BR'
      expect(value!.value.locale()).toBe('pt-br')

      i18n.global.locale.value = 'en'
      moment.locale('en')
    })
  })

  describe('registerPlugins', () => {
    it('Install every plugin on the app', () => {
      const app = createApp({})
      const useSpy = vi.spyOn(app, 'use')

      registerPlugins(app)

      expect(useSpy.mock.calls.map(([plugin]) => plugin)).toHaveLength(7)
      expect(useSpy).toHaveBeenCalledWith(i18n)
      expect(useSpy).toHaveBeenCalledWith(pinia)
      expect(useSpy).toHaveBeenCalledWith(vuetify)
      expect(useSpy).toHaveBeenCalledWith(apiPlugin)
      expect(useSpy).toHaveBeenCalledWith(errorPlugin)
      expect(typeof app.config.errorHandler).toBe('function')
    })
  })

  describe('events', () => {
    it('Emit the refresh event', () => {
      const handler = vi.fn()
      emitter.on('refresh', handler)
      emitter.emit('refresh')
      emitter.off('refresh', handler)
      emitter.emit('refresh')

      expect(handler).toHaveBeenCalledOnce()
    })
  })

  it('Ignore other errors on the response handlers', async () => {
    await expect(emitResponseError(new Error('x'))).resolves.toBeUndefined()
  })
})
