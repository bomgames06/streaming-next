import 'moment/locale/pt-br';

export default function initPtBr(moment: any) {
  moment.updateLocale('pt-br', {
    durationLabelsStandard: {
      S: 'milissegundo',
      SS: 'milissegundos',
      s: 'segundo',
      ss: 'segundos',
      m: 'minuto',
      mm: 'minutos',
      h: 'hora',
      hh: 'horas',
      d: 'dia',
      dd: 'dias',
      w: 'semana',
      ww: 'semanas',
      M: 'mês',
      MM: 'mêses',
      y: 'ano',
      yy: 'anos',
    },
    durationLabelsShort: {
      S: 'msec',
      SS: 'msecs',
      s: 'sec',
      ss: 'secs',
      m: 'min',
      mm: 'mins',
      h: 'hr',
      hh: 'hrs',
      d: 'dy',
      dd: 'dys',
      w: 'wk',
      ww: 'wks',
      M: 'mo',
      MM: 'mos',
      y: 'yr',
      yy: 'yrs',
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
    durationPluralKey(token: any, integerValue: any, decimalValue: any) {
      if (integerValue === 1 && decimalValue === null) {
        return token;
      }

      return token + token;
    },
  });
}
