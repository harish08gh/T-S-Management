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

/**
 * Parses an individual time string (e.g. "10:00 AM", "04:00", "4:00 PM", "12:00") into minutes from midnight (0..1439).
 * If no AM/PM indicator is provided, infers standard institute hours:
 * - 1..6 -> PM (13:00 to 18:59)
 * - 7 -> if evening context, 19:00 (or morning 07:00)
 * - 8..11 -> AM (08:00 to 11:59)
 * - 12 -> PM (12:00 noon)
 */
export function parseTimePartToMinutes(timeStr: string, isEndSlot = false, startMinutes?: number): number {
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const digits = clean.replace(/[^\d:]/g, '');
  const [hStr, mStr] = digits.split(':');
  let hour = parseInt(hStr || '0', 10);
  const min = parseInt(mStr || '0', 10);

  if (isPM) {
    if (hour < 12) hour += 12;
  } else if (isAM) {
    if (hour === 12) hour = 0;
  } else {
    // No AM/PM specified: heuristic for training institute batches
    if (hour >= 1 && hour <= 6) {
      hour += 12; // 1 PM - 6 PM
    } else if (hour === 7) {
      // 7:00 can be 7 PM (19:00) in evening batch or 7 AM in morning weekend batch
      hour = 19;
    }
    // If it's an end slot and calculated minutes <= startMinutes, add 12 hours (e.g. 11:00 AM to 01:00 PM or 09:00 AM to 01:00 PM)
    if (isEndSlot && startMinutes !== undefined) {
      let calc = hour * 60 + min;
      if (calc <= startMinutes) {
        hour += 12;
      }
    }
  }

  return hour * 60 + min;
}

export interface ClassWindowStatus {
  inWindow: boolean;
  status: 'before' | 'active' | 'after';
  startsInMinutes: number;
  endsInMinutes: number;
  activeSlot?: { startMin: number; endMin: number };
  rawTiming: string;
}

/**
 * Checks if the current time falls inside the student's scheduled class time window.
 * The window opens 15 minutes before the scheduled start time and closes when the session ends.
 * Handles single or multiple time slots (e.g. "11:00-12:00, 06:00 - 07:00").
 */
export function isStudentInClassWindow(
  timingStr: string,
  referenceDate: Date = new Date()
): ClassWindowStatus {
  if (!timingStr || !timingStr.trim()) {
    return {
      inWindow: false,
      status: 'before',
      startsInMinutes: 0,
      endsInMinutes: 0,
      rawTiming: timingStr
    };
  }

  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  const subSlots = timingStr.split(',').map(s => s.trim()).filter(Boolean);

  let bestStatus: 'before' | 'active' | 'after' = 'after';
  let minStartsIn = Infinity;
  let activeSlot: { startMin: number; endMin: number } | undefined = undefined;

  for (const slot of subSlots) {
    const parts = slot.split('-');
    if (parts.length < 2) continue;

    const startMin = parseTimePartToMinutes(parts[0], false);
    const endMin = parseTimePartToMinutes(parts[1], true, startMin);
    const windowStart = Math.max(0, startMin - 15); // 15 mins early access

    // Check if active right now
    if (currentMinutes >= windowStart && currentMinutes <= endMin) {
      return {
        inWindow: true,
        status: 'active',
        startsInMinutes: 0,
        endsInMinutes: Math.max(0, endMin - currentMinutes),
        activeSlot: { startMin, endMin },
        rawTiming: timingStr
      };
    }

    if (currentMinutes < windowStart) {
      const diff = windowStart - currentMinutes;
      if (diff < minStartsIn) {
        minStartsIn = diff;
        bestStatus = 'before';
      }
    }
  }

  return {
    inWindow: false,
    status: minStartsIn < Infinity ? 'before' : 'after',
    startsInMinutes: minStartsIn < Infinity ? minStartsIn : 0,
    endsInMinutes: 0,
    activeSlot,
    rawTiming: timingStr
  };
}

