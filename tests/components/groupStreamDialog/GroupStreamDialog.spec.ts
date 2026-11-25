import { describe, expect, it } from 'vitest'
import { mdiCheckboxBlankOutline, mdiCheckboxMarked } from '@mdi/js'
import { VAutocomplete, VConfirmEdit, VTextField } from 'vuetify/components'
import GroupStreamDialog from '@/components/groupStreamDialog/GroupStreamDialog.vue'
import GroupStreamListItem from '@/components/groupStreamDialog/GroupStreamListItem.vue'
import { bodyFind, bodyFindAll, bodyFindByText, mountWithStore, settle } from '@tests/__utils__/util'
import { streamItem } from '@tests/__utils__/fixtures'

const streams = [
  streamItem({ id: '2', name: 'Bravo', profileImage: 'https://p/b.png' }),
  streamItem({ id: '1', name: 'Alpha', profileImage: 'https://p/a.png' }),
]
const groups = [
  { id: 'g2', name: 'Zeta', streams: [] },
  {
    id: 'g1',
    name: 'Friends',
    streams: [
      { type: 'twitch', id: '1' },
      { type: 'twitch', id: 'unknown' },
    ],
  },
]

async function mountDialog(props?: Record<string, unknown>, state?: Record<string, unknown>) {
  const result = mountWithStore(GroupStreamDialog, {
    props: { modelValue: true, streams, ...props },
    state: { groupStreams: groups, ...state },
  })
  await settle()
  return result
}
function groupTitles() {
  return bodyFindAll('.group-stream-list-item .v-list-item-title').map((title) => title.textContent)
}
async function click(element: Element | null | undefined) {
  ;(element as HTMLElement).click()
  await settle()
}

describe('GroupStreamDialog.vue', () => {
  it('Show the activator slot', async () => {
    const { wrapper } = mountWithStore(GroupStreamDialog, {
      props: { streams },
      slots: { activator: '<button class="open" v-bind="props">Open</button>' },
    })

    await wrapper.find('.open').trigger('click')
    await settle()

    expect(bodyFindByText('.v-card-title', 'Stream groups')).toBeTruthy()
  })
  it('Show a message without groups and add a group', async () => {
    const { wrapper, system } = await mountDialog({}, { groupStreams: [] })
    expect(bodyFind('.v-overlay--active')!.textContent).toContain('No groups')
    const addButton = bodyFind<HTMLButtonElement>('.v-overlay--active button[aria-label="Add"]')!
    expect(addButton.disabled).toBe(true)

    const input = wrapper.findComponent(VTextField).find('input')
    await input.setValue('  New group  ')
    await input.trigger('keydown', { key: 'Enter' })
    await settle()

    expect(system.groupStreams.map((group) => group.name)).toStrictEqual(['New group'])
    expect((input.element as HTMLInputElement).value).toBe('')
    // Nothing happens without a name
    await click(addButton)
    expect(system.groupStreams).toHaveLength(1)

    await input.setValue('Other')
    await click(bodyFind('.v-overlay--active button[aria-label="Add"]'))
    expect(groupTitles()).toStrictEqual(['New group', 'Other'])
  })
  it('List the groups ordered by name with the stream count', async () => {
    await mountDialog()

    expect(groupTitles()).toStrictEqual(['Friends', 'Zeta'])
    expect(
      bodyFindAll('.group-stream-list-item .v-list-item-subtitle').map((value) => value.textContent)
    ).toStrictEqual(['Streams: 2', 'Stream: None'])
  })
  it('Expand a group to manage its streams', async () => {
    const { wrapper, system } = await mountDialog()

    await click(bodyFindByText('.group-stream-list-item', 'FriendsStreams: 2'))
    // Only the expanded group stays visible, unknown streams are skipped
    expect(bodyFindAll<HTMLElement>('.group-stream-list-item').map((item) => item.style.display)).toStrictEqual([
      '',
      'none',
    ])
    expect(bodyFindAll('.stream-group-content .v-list-item-title').map((value) => value.textContent)).toStrictEqual([
      'Alpha',
    ])

    // Add a stream
    await click(bodyFindByText('.v-list-item', 'Add stream'))
    const autocomplete = wrapper.findComponent(VAutocomplete)
    expect(autocomplete.props('items')!.map((item: { name: string }) => item.name)).toStrictEqual(['Alpha', 'Bravo'])
    expect(bodyFind<HTMLButtonElement>('.v-overlay--active .v-list button[aria-label="Add"]')!.disabled).toBe(true)
    autocomplete.vm.$emit('update:modelValue', streams[0])
    await settle()
    await click(bodyFind('.v-overlay--active .v-list button[aria-label="Add"]'))
    expect(system.groupStreams.find((group) => group.id === 'g1')!.streams).toContainEqual({ type: 'twitch', id: '2' })
    expect(bodyFindByText('.v-list-item', 'Add stream')).toBeTruthy()

    // Add with enter and close the field
    await click(bodyFindByText('.v-list-item', 'Add stream'))
    await wrapper.findComponent(VAutocomplete).find('input').trigger('keydown', { key: 'Enter' })
    await click(bodyFind('.v-overlay--active button[aria-label="Close"]'))
    expect(wrapper.findComponent(VAutocomplete).exists()).toBe(false)

    // Remove a stream of the group
    await click(bodyFindAll('.stream-group-content .v-btn')[0])
    expect(system.groupStreams.find((group) => group.id === 'g1')!.streams).toStrictEqual([
      { type: 'twitch', id: 'unknown' },
      { type: 'twitch', id: '2' },
    ])

    // Clicking the group again goes back to the list
    await click(bodyFindByText('.group-stream-list-item', 'FriendsStreams: 2'))
    expect(bodyFindAll('.stream-group-content')).toHaveLength(0)
  })
  it('Delete a group', async () => {
    const { wrapper, system } = await mountDialog()
    await click(bodyFindByText('.group-stream-list-item', 'FriendsStreams: 2'))

    wrapper.findAllComponents(GroupStreamListItem)[0].vm.$emit('delete')
    await settle()

    expect(system.groupStreams.map((group) => group.id)).toStrictEqual(['g2'])
    expect(bodyFindAll('.stream-group-content')).toHaveLength(0)
  })
  it('Rename a group from the edit dialog', async () => {
    const { wrapper, system } = await mountDialog()

    await click(bodyFindAll('.group-stream-list-item .v-btn')[0])
    expect(bodyFindByText('.v-card-title', 'Edit')).toBeTruthy()
    const confirmEdit = wrapper.findComponent(VConfirmEdit)
    confirmEdit.vm.$emit('update:modelValue', '  Best friends ')
    expect(system.groupStreams.find((group) => group.id === 'g1')!.name).toBe('Best friends')

    // Blank names are ignored
    confirmEdit.vm.$emit('update:modelValue', '   ')
    expect(system.groupStreams.find((group) => group.id === 'g1')!.name).toBe('Best friends')

    confirmEdit.vm.$emit('save')
    await settle()
    expect(bodyFindByText('.v-overlay--active .v-card-title', 'Edit')).toBeFalsy()
  })
  it('Delete a group with its button and rename it typing', async () => {
    const { system } = await mountDialog()

    // The delete button does not expand the group
    await click(bodyFindAll('.group-stream-list-item .v-list-item__append .v-btn')[1])
    expect(system.groupStreams.map((group) => group.id)).toStrictEqual(['g1'])
    expect(bodyFindAll('.stream-group-content')).toHaveLength(0)

    await click(bodyFindAll('.group-stream-list-item .v-list-item__prepend .v-btn')[0])
    const input = bodyFindAll<HTMLInputElement>('.v-overlay--active input').at(-1)!
    input.value = 'Renamed'
    input.dispatchEvent(new Event('input'))
    await settle()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await settle()

    expect(system.groupStreams[0].name).toBe('Renamed')
  })
  it('Cancel the rename', async () => {
    const { wrapper, system } = await mountDialog()

    await click(bodyFindAll('.group-stream-list-item .v-btn')[0])
    expect(bodyFindByText('.v-overlay--active .v-card-title', 'Edit')).toBeTruthy()
    wrapper.findComponent(VConfirmEdit).vm.$emit('cancel')
    await settle()

    expect(bodyFindByText('.v-overlay--active .v-card-title', 'Edit')).toBeFalsy()
    expect(system.groupStreams.find((group) => group.id === 'g1')!.name).toBe('Friends')
  })
  it('Toggle the groups of a stream', async () => {
    const { wrapper, system } = await mountDialog({ streamItem: streams[1] })

    expect(bodyFind('.v-overlay--active .v-card-text')!.textContent).toContain('Alpha')
    const items = wrapper.findAllComponents(GroupStreamListItem)
    expect(items.map((item) => item.attributes('aria-selected'))).toStrictEqual(['true', 'false'])
    expect(items[0].html()).toContain(mdiCheckboxMarked)
    expect(items[1].html()).toContain(mdiCheckboxBlankOutline)

    await click(items[1].element)
    expect(system.groupStreams.find((group) => group.id === 'g2')!.streams).toStrictEqual([{ type: 'twitch', id: '1' }])
    await click(wrapper.findAllComponents(GroupStreamListItem)[0].element)
    expect(system.groupStreams.find((group) => group.id === 'g1')!.streams).toStrictEqual([
      { type: 'twitch', id: 'unknown' },
    ])

    // A new group already includes the stream
    const input = wrapper.findComponent(VTextField).find('input')
    await input.setValue('Mine')
    await input.trigger('keydown', { key: 'Enter' })
    expect(system.groupStreams.find((group) => group.name === 'Mine')!.streams).toStrictEqual([
      { type: 'twitch', id: '1' },
    ])
  })
  it('Reset the fields when reopened and close with the button', async () => {
    const { wrapper } = await mountDialog()
    await click(bodyFindByText('.group-stream-list-item', 'FriendsStreams: 2'))
    await wrapper.findComponent(VTextField).find('input').setValue('typed')

    await click(bodyFindByText('.v-overlay--active .v-card-actions .v-btn', 'Close'))
    expect(wrapper.emitted('update:modelValue')).toStrictEqual([[false]])
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await settle()

    expect((wrapper.findComponent(VTextField).find('input').element as HTMLInputElement).value).toBe('')
    expect(bodyFindAll('.stream-group-content')).toHaveLength(0)
  })
  it('Close with escape', async () => {
    const { wrapper } = await mountDialog()

    bodyFind('.v-overlay--active .v-card')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await settle()

    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
  })
})
