import { useI18n } from 'vue-i18n'
import moment from 'moment'

function useMoment() {
  const { locale } = useI18n()

  return computed(() => {
    moment.locale(locale.value)
    return moment
  })
}

export default useMoment
