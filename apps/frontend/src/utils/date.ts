export const format = (value: string) =>
  new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));

export const isSameHour = (value: string, hour: number) =>
  new Date(value).getHours() === hour;

export const formatDay = (value: string) =>
  new Intl.DateTimeFormat('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
