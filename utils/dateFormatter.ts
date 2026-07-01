/**
 * Safe date and time formatters for Brazilian Portuguese (PT-BR).
 * Avoids native timezone shift errors by parsing standard formats manually.
 */

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  
  // Format matching 2026-06-08T09:00:00+00:00 or 2026-06-08 09:00:00
  const dateTimeRegex = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/;
  const match = dateStr.match(dateTimeRegex);
  
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return `${day}/${month}/${year} às ${hour}:${minute}`;
  }
  
  // Dynamic date string parser like YYYY-MM-DD
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})/;
  const dateMatch = dateStr.match(dateRegex);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return `${day}/${month}/${year}`;
  }

  // Fallback if it's already a localized string or has another structure
  try {
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      const d = String(dateObj.getDate()).padStart(2, '0');
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const y = dateObj.getFullYear();
      const h = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      
      // If it has hours/minutes, display them, else just date
      if (h !== '00' || min !== '00') {
        return `${d}/${m}/${y} às ${h}:${min}`;
      }
      return `${d}/${m}/${y}`;
    }
  } catch (e) {
    // Return original if fallback fails
  }

  return dateStr;
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  
  // Extract date part from ISO or datetime
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})/;
  const match = dateStr.match(dateRegex);
  
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  
  return dateStr;
}

export function formatTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  
  // Extract time part from datetime
  const timeRegex = /[T ](\d{2}):(\d{2})/;
  const match = dateStr.match(timeRegex);
  
  if (match) {
    const [, hour, minute] = match;
    return `${hour}:${minute}`;
  }
  
  return dateStr;
}

export function formatDatesInText(text: string | undefined | null): string {
  if (!text) return '';
  
  // Matches e.g. 2026-06-08 09:00:00+00, 2026-06-08T09:00:00+00:00, 2026-06-08 09:00:00, 2026-06-08 09:00, or 2026-06-08
  const dateTimeRegex = /(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::\d{2})?(?:\+\d{2}(?::?\d{2})?|Z)?)?/g;
  
  return text.replace(dateTimeRegex, (match, year, month, day, hour, minute) => {
    if (hour && minute) {
      return `${day}/${month}/${year} às ${hour}:${minute}`;
    }
    return `${day}/${month}/${year}`;
  });
}

