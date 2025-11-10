import { DateTime } from 'luxon';
import { SettingEntity } from '../entities/setting.entity';

export const toDateTime = (value: Date | string, timezone: string) =>
  DateTime.fromJSDate(value instanceof Date ? value : new Date(value), {
    zone: timezone,
  });

export const combineDateAndTime = (
  dateISO: string,
  time: string,
  timezone: string,
) => {
  const [hour, minute] = time.split(':').map((part) => parseInt(part, 10));
  return DateTime.fromISO(dateISO, { zone: timezone })
    .set({ hour, minute, second: 0, millisecond: 0 })
    .toJSDate();
};

export const isWithinSchedule = (
  date: DateTime,
  settings: SettingEntity,
): boolean => {
  const open = DateTime.fromFormat(settings.openHour, 'HH:mm', {
    zone: settings.timezone,
  });
  const close = DateTime.fromFormat(settings.closeHour, 'HH:mm', {
    zone: settings.timezone,
  });
  const day = date.weekday % 7; // convert to 0-6
  if (settings.closedWeekdays?.includes(day)) {
    return false;
  }
  return (
    date.hour > open.hour ||
    (date.hour === open.hour && date.minute >= open.minute)
  ) &&
    (date.hour < close.hour ||
      (date.hour === close.hour && date.minute <= close.minute));
};

export const addSlotMinutes = (date: DateTime, minutes: number) =>
  date.plus({ minutes });

