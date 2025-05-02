import 'moment/dist/locale/pt-br'
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
    MM: 'meses',
    MMM: 'meses',
    y: 'ano',
    yy: 'anos',
    yyy: 'anos',
  },
  durationLabelsShort: {
    S: 'mseg',
    SS: 'msegs',
    SSS: 'msegs',
    s: 'seg',
    ss: 'segs',
    sss: 'segs',
    m: 'min',
    mm: 'mins',
    mmm: 'mins',
    h: 'hr',
    hh: 'hrs',
    hhh: 'hrs',
    d: 'dia',
    dd: 'dias',
    ddd: 'dias',
    w: 'sem',
    ww: 'sems',
    www: 'sems',
    M: 'mês',
    MM: 'meses',
    MMM: 'meses',
    y: 'ano',
    yy: 'anos',
    yyy: 'anos',
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
