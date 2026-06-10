const TIME_ZONE = 'America/Caracas';
const FORMAT_OPTIONS = {
  timeZone: TIME_ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
};

const formatCaracasTimestamp = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('sv-SE', FORMAT_OPTIONS);
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}-04:00`;
};

const formatCaracasFilenameTimestamp = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('sv-SE', FORMAT_OPTIONS);
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}${values.month}${values.day}_${values.hour}${values.minute}${values.second}`;
};

module.exports = {
  formatCaracasTimestamp,
  formatCaracasFilenameTimestamp
};
