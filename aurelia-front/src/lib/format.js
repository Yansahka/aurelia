export const makeMoney = (locale, currency) => (n) =>
  new Intl.NumberFormat(locale).format(n).replace(/[\u202f\u00a0]/g, ' ') + ' ' + currency;
