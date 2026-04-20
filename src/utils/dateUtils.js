// Date validation and comparison utilities shared by DTC and Non-DTC filter forms.

// Returns { valid: true } or { valid: false, error: string }
export const validateDateRange = (fromDate, toDate, label = 'Event') => {
  if (fromDate && new Date(fromDate) > new Date()) {
    return { valid: false, error: `${label} From date cannot be a future date.` };
  }
  if (toDate && new Date(toDate) > new Date()) {
    return { valid: false, error: `${label} To date cannot be a future date.` };
  }
  if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
    return { valid: false, error: `${label} From date cannot be later than To date.` };
  }
  return { valid: true };
};

// Returns true when itemDate falls within [startDate, endDate] (both optional).
export const isDateInRange = (itemDate, startDate, endDate) => {
  const item = new Date(itemDate);
  if (startDate && item < new Date(startDate)) return false;
  if (endDate   && item > new Date(`${endDate}T23:59:59`)) return false;
  return true;
};

// Build a combined ISO datetime string from separate date + time inputs.
// Falls back to defaultTime when time is not supplied.
export const combineDateTime = (date, time, defaultTime = '00:00:00') =>
  date ? `${date}T${time || defaultTime}` : '';
