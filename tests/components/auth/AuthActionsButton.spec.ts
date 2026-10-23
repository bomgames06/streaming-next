import { describe, expect, it } from 'vitest'
import { mdiTwitch } from '@mdi/js'
import AuthActionsButton from '@/components/auth/AuthActionsButton.vue'
import { mountWithStore } from '@tests/__utils__/util'
import { account } from '@tests/__utils__/fixtures'

function mountButton(props: Record<string, unknown>) {
  return mountWithStore(AuthActionsButton, {
    props: { iconAuth: mdiTwitch, textAuth: 'Authenticate on Twitch', dataTestid: 'twitch-auth', ...props },
  })
}

describe('AuthActionsButton.vue', () => {
  describe('List item mode', () => {
    it('Emit the account click with the mouse buttons', async () => {
      const value = account()
      const { wrapper } = mountButton({ listItem: true, account: value })
      const item = wrapper.find('[data-testid="twitch-auth"]')

      await item.trigger('click')
      await item.trigger('mousedown', { button: 1 })

      expect(wrapper.emitted('click')).toStrictEqual([
        [{ account: value, middle: false }],
        [{ account: value, middle: true }],
      ])
    })
    it('Emit the account click with the keyboard', async () => {
      const value = account()
      const { wrapper } = mountButton({ listItem: true, account: value })
      const item = wrapper.find('[data-testid="twitch-auth"]')

      await item.trigger('keydown', { key: 'Enter' })
      await item.trigger('keydown', { key: ' ' })

      expect(wrapper.emitted('click')).toStrictEqual([
        [{ account: value, middle: false }],
        [{ account: value, middle: false }],
      ])
    })
    it('Emit a single click per key press', async () => {
      const { wrapper } = mountButton({ listItem: true, account: account() })

      await wrapper.find('[data-testid="twitch-auth"]').trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('click')).toHaveLength(1)
    })
    it('Emit delete without clicking the account', async () => {
      const { wrapper } = mountButton({ listItem: true, account: account() })
      const remove = wrapper.find('[data-testid="twitch-auth-delete"]')

      expect(remove.attributes('aria-label')).toBe('Remove')
      await remove.trigger('click')
      await remove.trigger('keydown', { key: 'Enter' })
      await remove.trigger('keydown', { key: ' ' })

      expect(wrapper.emitted('delete')).toHaveLength(3)
      expect(wrapper.emitted('click')).toBeUndefined()
    })
    it('Emit auth without account', async () => {
      const { wrapper } = mountButton({ listItem: true })

      await wrapper.find('[data-testid="twitch-auth"]').trigger('click')

      expect(wrapper.emitted('auth')).toHaveLength(1)
    })
  })

  describe('Button mode', () => {
    it('Authenticate or remove an invalid account', async () => {
      const { wrapper } = mountButton({ account: account({ invalid: true }), colorAuth: 'twitch' })

      const auth = wrapper.find('button[data-testid="twitch-auth"]')
      expect(auth.attributes('aria-label')).toBe('Authenticate Me')
      await auth.trigger('click')
      const remove = wrapper.find('button[data-testid="twitch-auth-delete"]')
      expect(remove.attributes('aria-label')).toBe('Remove Me')
      await remove.trigger('click')

      expect(wrapper.emitted('auth')).toHaveLength(1)
      expect(wrapper.emitted('delete')).toHaveLength(1)
    })
    it('Disable the buttons while authenticating', async () => {
      const { wrapper } = mountButton({ account: account({ invalid: true }), authenticating: true })

      expect(wrapper.find('button[data-testid="twitch-auth"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('button[data-testid="twitch-auth-delete"]').attributes('disabled')).toBeDefined()

      await wrapper.setProps({ account: undefined })
      expect(wrapper.find('button[data-testid="twitch-auth"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('.v-progress-circular').exists()).toBe(true)
    })
  })
})
