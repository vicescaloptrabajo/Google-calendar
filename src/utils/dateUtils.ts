/**
 * Local Date & Time Utilities
 * Prevents UTC offset shifts (.toISOString()) from moving evening events to the next day.
 */

/**
 * Returns YYYY-MM-DD in the user's LOCAL timezone
 */
export const toLocalDateKey = (dateInput: Date | string | number): string => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns YYYY-MM-DDTHH:mm in the user's LOCAL timezone for <input type="datetime-local" />
 */
export const toLocalDateTimeInput = (dateInput: Date | string | number): string => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return toLocalDateTimeInput(new Date());
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Parses a datetime-local string (YYYY-MM-DDTHH:mm) or flexible date value into a valid ISO string
 * preserving the exact local date and time selected by the user.
 */
export const localInputToIso = (inputStr: string): string => {
  if (!inputStr) return new Date().toISOString();
  // Format: YYYY-MM-DDTHH:mm
  const match = inputStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (match) {
    const [, y, m, d, hh, mm] = match;
    const localDate = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
    return localDate.toISOString();
  }
  const parsed = new Date(inputStr);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

/**
 * Parses dates from Excel (ServiceNow / JIRA exports):
 * Supports Excel serial numbers, DD/MM/YYYY HH:mm, YYYY-MM-DD HH:mm:ss, etc.
 */
export const parseFlexibleDate = (raw: any, fallbackHours = 20): Date | null => {
  if (raw === null || raw === undefined || raw === '') return null;

  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }

  // Excel serial date number (e.g. 46302.83333)
  if (typeof raw === 'number' && raw > 20000 && raw < 90000) {
    // Excel base date: Dec 30, 1899
    const utcDays = Math.floor(raw - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const fractionalDay = raw - Math.floor(raw) + 0.0000001;
    let totalSeconds = Math.floor(86400 * fractionalDay);
    const seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    const hours = Math.floor(totalSeconds / (60 * 60));
    const minutes = Math.floor(totalSeconds / 60) % 60;

    return new Date(
      dateInfo.getUTCFullYear(),
      dateInfo.getUTCMonth(),
      dateInfo.getUTCDate(),
      hours,
      minutes,
      seconds
    );
  }

  const str = String(raw).trim();
  if (!str) return null;

  // Match DD/MM/YYYY HH:mm(:ss) or DD-MM-YYYY HH:mm(:ss)
  const dmyMatch = str.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm|a\.\s*m\.|p\.\s*m\.)?)?/
  );
  if (dmyMatch) {
    let [, p1, p2, yearStr, hhStr, mmStr, ssStr, ampm] = dmyMatch;
    let day = Number(p1);
    let month = Number(p2);
    // If p1 <= 12 and p2 > 12, swap for MM/DD/YYYY
    if (day <= 12 && month > 12) {
      const tmp = day;
      day = month;
      month = tmp;
    }
    let hours = hhStr !== undefined ? Number(hhStr) : fallbackHours;
    const minutes = mmStr !== undefined ? Number(mmStr) : 0;
    const seconds = ssStr !== undefined ? Number(ssStr) : 0;
    if (ampm) {
      const isPm = ampm.toLowerCase().startsWith('p');
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    }
    const result = new Date(Number(yearStr), month - 1, day, hours, minutes, seconds);
    if (!isNaN(result.getTime())) return result;
  }

  // Match YYYY-MM-DD HH:mm(:ss) or YYYY/MM/DD HH:mm(:ss)
  const ymdMatch = str.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (ymdMatch && !str.endsWith('Z')) {
    const [, yearStr, monthStr, dayStr, hhStr, mmStr, ssStr] = ymdMatch;
    const hours = hhStr !== undefined ? Number(hhStr) : fallbackHours;
    const minutes = mmStr !== undefined ? Number(mmStr) : 0;
    const seconds = ssStr !== undefined ? Number(ssStr) : 0;
    const result = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr), hours, minutes, seconds);
    if (!isNaN(result.getTime())) return result;
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
};
