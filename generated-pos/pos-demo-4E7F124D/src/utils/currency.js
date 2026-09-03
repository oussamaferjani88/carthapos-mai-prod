const CURRENCY_SYMBOLS = {
  TND: 'DT',
  EUR: '\u20AC',
  USD: '$',
  GBP: '\u00A3',
  CHF: 'CHF',
  DZD: 'DA',
  MAD: 'MAD',
  SAR: 'SAR',
  AED: 'AED',
  CAD: 'CA$',
  JPY: '\u00A5',
  CNY: '\u00A5',
  TRY: '\u20BA',
  EGP: 'EGP',
  NGN: 'NGN',
  KWD: 'KD',
  BHD: 'BD',
  QAR: 'QAR',
  OMR: 'OMR',
};

function getCurrencySymbol(currencyCode) {
  if (!currencyCode) return 'DT';
  const code = String(currencyCode).toUpperCase().trim();
  return CURRENCY_SYMBOLS[code] || code;
}

function formatCurrency(amount, currency, currencyPosition) {
  const val = parseFloat(amount) || 0;
  const code = currency || 'TND';
  const symbol = getCurrencySymbol(code);
  const position = currencyPosition || 'after';

  return position === 'before'
    ? `${symbol}${val.toFixed(3)}`
    : `${val.toFixed(3)} ${symbol}`;
}

function formatCurrencyShort(amount, currency, currencyPosition) {
  const val = parseFloat(amount) || 0;
  const code = currency || 'TND';
  const symbol = getCurrencySymbol(code);
  const position = currencyPosition || 'after';

  if (val >= 1000000) {
    const shortened = (val / 1000000).toFixed(1);
    return position === 'before'
      ? `${symbol}${shortened}M`
      : `${shortened}M ${symbol}`;
  }
  if (val >= 1000) {
    const shortened = (val / 1000).toFixed(1);
    return position === 'before'
      ? `${symbol}${shortened}K`
      : `${shortened}K ${symbol}`;
  }

  return position === 'before'
    ? `${symbol}${val.toFixed(2)}`
    : `${val.toFixed(2)} ${symbol}`;
}

function makeFormatter(currency, currencyPosition) {
  return (amount) => formatCurrency(amount, currency, currencyPosition);
}

export { getCurrencySymbol, formatCurrency, formatCurrencyShort, makeFormatter, CURRENCY_SYMBOLS };
