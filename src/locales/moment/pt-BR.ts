import 'moment/dist/locale/pt-br.js'
import moment from 'moment'

moment.updateLocale('pt-br', {
  durationLabelsStandard: {
    S: 'milissegundo',
    SS: 'milissegundos',
    SSS: 'milissegundos',
    s: 'segundo',
    ss: 'segundos',
    sss: 'segundos',
    m: 'minuto',
    mm: 'minutos',
    mmm: 'minutos',
    h: 'hora',
    hh: 'horas',
    hhh: 'horas',
    d: 'dia',
    dd: 'dias',
    ddd: 'dias',
    w: 'semana',
    ww: 'semanas',
    www: 'semanas',
    M: 'mês',
    MM: 'mêses',
    MMM: 'mêses',
    y: 'ano',
    yy: 'anos',
    yyy: 'anos',
  },
  durationLabelsShort: {
    S: 'msec',
    SS: 'msecs',
    SSS: 'msecs',
    s: 'sec',
    ss: 'secs',
    sss: 'secs',
    m: 'min',
    mm: 'mins',
    mmm: 'mins',
    h: 'hr',
    hh: 'hrs',
    hhh: 'hrs',
    d: 'dy',
    dd: 'dys',
    ddd: 'dys',
    w: 'wk',
    ww: 'wks',
    www: 'wks',
    M: 'mo',
    MM: 'mos',
    MMM: 'mos',
    y: 'yr',
    yy: 'yrs',
    yyy: 'yrs',
  },
  durationTimeTemplates: {
    HMS: 'h:mm:ss',
    HM: 'h:mm',
    MS: 'm:ss',
  },
  durationLabelTypes: [
    {
      type: 'standard',
      string: '__',
    },
    {
      type: 'short',
      string: '_',
    },
  ],
  durationPluralKey(token: string, integerValue: number, decimalValue: number): string {
    if (integerValue === 1 && decimalValue === null) {
      return token
    }

    return token + token
  },
})
