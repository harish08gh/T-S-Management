/**
 * Schedule & Timing Utilities for Weekdays / Weekend Class Management
 */
import { Student, ClassMode } from '../types';

/**
 * Checks if a date (YYYY-MM-DD or Date object) falls on a weekend (Saturday or Sunday)
 */
export function isWeekend(dateOrStr: Date | string): boolean {
  const d = typeof dateOrStr === 'string'
    ? new Date(dateOrStr + (dateOrStr.length === 10 ? 'T00:00:00' : ''))
    : dateOrStr;
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Returns 'Weekend' if the given date is Saturday or Sunday, else 'Weekdays'
 */
export function getDayMode(dateOrStr: Date | string): ClassMode {
  return isWeekend(dateOrStr) ? 'Weekend' : 'Weekdays';
}

/**
 * Gets day name (e.g., 'Monday', 'Saturday')
 */
export function getDayName(dateOrStr: Date | string): string {
  const d = typeof dateOrStr === 'string'
    ? new Date(dateOrStr + (dateOrStr.length === 10 ? 'T00:00:00' : ''))
    : dateOrStr;
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Returns the effective timing for a student on a specific date:
 * 1. Checks for temporary timing override for this date
 * 2. If date is Weekend, prefers student.weekendTiming || student.timing
 * 3. If date is Weekday, prefers student.weekdayTiming || student.timing
 * 4. Fallback default
 */
export function getStudentEffectiveTiming(student: Student, dateStr: string): string {
  if (student.tempTimingOverrides?.[dateStr]?.timing) {
    return student.tempTimingOverrides[dateStr].timing;
  }
  const weekend = isWeekend(dateStr);
  if (weekend) {
    return student.weekendTiming || student.timing || '10:00 AM - 12:00 PM';
  } else {
    return student.weekdayTiming || student.timing || '09:00 AM - 10:30 AM';
  }
}

/**
 * Checks whether classes are conducted for this student on the specified date:
 * - If student has a temporary override on that date -> true (explicit session scheduled)
 * - Otherwise matches student.mode with the date's day mode (Weekdays vs Weekend)
 */
export function isStudentScheduledOnDate(student: Student, dateStr: string): boolean {
  if (student.tempTimingOverrides?.[dateStr]) {
    return true; // Explicit override session scheduled
  }
  const targetDayMode = getDayMode(dateStr);
  return student.mode === targetDayMode;
}

/**
 * Calculates the next upcoming class date and timing for a student
 */
export function getStudentNextClassInfo(
  student: Student,
  referenceDateStr: string
): {
  dateStr: string;
  dayName: string;
  isToday: boolean;
  timing: string;
  mode: ClassMode;
} {
  const refDate = new Date(referenceDateStr + 'T00:00:00');
  
  // Check if today is a class day
  if (isStudentScheduledOnDate(student, referenceDateStr)) {
    return {
      dateStr: referenceDateStr,
      dayName: getDayName(refDate),
      isToday: true,
      timing: getStudentEffectiveTiming(student, referenceDateStr),
      mode: student.mode
    };
  }

  // Look ahead up to 7 days
  for (let offset = 1; offset <= 7; offset++) {
    const nextDate = new Date(refDate);
    nextDate.setDate(refDate.getDate() + offset);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    
    if (isStudentScheduledOnDate(student, nextDateStr)) {
      return {
        dateStr: nextDateStr,
        dayName: getDayName(nextDate),
        isToday: false,
        timing: getStudentEffectiveTiming(student, nextDateStr),
        mode: student.mode
      };
    }
  }

  return {
    dateStr: referenceDateStr,
    dayName: getDayName(refDate),
    isToday: false,
    timing: student.timing || '09:00 AM - 10:30 AM',
    mode: student.mode
  };
}
