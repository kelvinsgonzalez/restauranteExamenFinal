import { Reservation } from '../types';
import { format, isSameHour } from '../utils/date';
import { cn } from '../lib/ui';

const hours = Array.from({ length: 12 }, (_, idx) => 10 + idx); // 10am to 9pm

interface CalendarProps {
  reservations: Reservation[];
}

const Calendar = ({ reservations }: CalendarProps) => {
  return (
    <div className="grid grid-cols-[120px,1fr]">
      <div className="space-y-4 text-sm text-neutral-500">
        {hours.map((hour) => (
          <div key={hour} className="h-16 border-b border-dashed border-neutral-200">
            {hour}:00
          </div>
        ))}
      </div>
      <div className="relative">
        {hours.map((hour) => (
          <div key={hour} className="relative h-16 border-b border-neutral-100">
            {reservations
              .filter((res) => isSameHour(res.startsAt, hour))
              .map((res) => (
                <div
                  key={res.id}
                  className={cn(
                    'absolute left-2 right-2 rounded-lg border px-3 py-2 text-sm shadow-sm',
                    res.status === 'CONFIRMED'
                      ? 'border-green-400 bg-green-50'
                      : 'border-amber-400 bg-amber-50',
                  )}
                >
                  <p className="font-semibold">Mesa #{res.table?.number ?? '-'} · {res.people} personas</p>
                  <p className="text-xs text-neutral-500">{format(res.startsAt)}</p>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
