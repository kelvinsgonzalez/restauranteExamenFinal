import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getDashboardOverview } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { toast } from 'sonner';
import { DashboardOverview } from '../types';
import { cn } from '../lib/ui';

const fetchOccupancy = async () => {
  const { data } = await api.get('/reports/occupancy', {
    params: { range: 'day', date: new Date().toISOString().slice(0, 10) },
  });
  return data;
};

const DashboardRoute = () => {
  const [daysRange, setDaysRange] = useState(7);
  const { data: occupancy } = useQuery({
    queryKey: ['reports', 'occupancy'],
    queryFn: fetchOccupancy,
    refetchInterval: 60_000,
  });
  const { data: overview } = useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview', daysRange],
    queryFn: ({ signal }) => getDashboardOverview({ days: daysRange, signal }),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const socket = connectSocket();
    socket.on('reservation.created', (payload) => {
      toast.success('Nueva reserva creada', {
        description: `${payload?.customer?.fullName ?? 'Cliente'} - Mesa ${
          payload?.table?.number ?? ''
        }`,
      });
    });
    socket.on('reservation.cancelled', () => {
      toast('Reserva cancelada', { description: 'Se liberó una mesa' });
    });
    socket.connect();
    return () => {
      socket.off('reservation.created');
      socket.off('reservation.cancelled');
      disconnectSocket();
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel p-4">
          <p className="text-sm text-neutral-500">Ocupación estimada</p>
          <p className="text-3xl font-semibold">
            {overview?.totals.occupancyPercent ?? occupancy?.occupancyPct ?? 0}%
          </p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-neutral-500">Reservas hoy</p>
          <p className="text-3xl font-semibold">{overview?.totals.todayCount ?? 0}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-neutral-500">Horas pico</p>
          <p className="text-lg font-semibold">
            {occupancy?.peakHours?.map((item: any) => item.hour).join(', ') || '--'}
          </p>
        </div>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="glass-panel p-6">
          <h2 className="mb-4 text-xl font-semibold">Reservas confirmadas</h2>
          <div className="divide-y">
            {overview?.today?.length ? (
              overview.today.map((res) => (
                <div key={res.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">Mesa #{res.tableNumber} — {res.customerName}</p>
                    <p className="text-neutral-500">
                      {res.start}–{res.end} · {res.durationMinutes} min
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs uppercase">
                    {res.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-neutral-500">Sin reservas confirmadas hoy.</p>
            )}
          </div>
        </section>
        <section className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Próximas reservaciones</h2>
            <div className="flex gap-2 text-xs">
              {[7, 14, 30].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDaysRange(range)}
                  className={cn(
                    'rounded-full border px-3 py-1 font-semibold transition',
                    range === daysRange
                      ? 'border-brand bg-amber-100 text-brand'
                      : 'border-neutral-200 bg-white text-neutral-700',
                  )}
                >
                  {range} días
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[24rem] space-y-4 overflow-y-auto pr-2 text-sm">
            {overview?.upcoming?.length ? (
              overview.upcoming.map((group) => (
                <div key={group.date} className="space-y-2">
                  <p className="text-xs uppercase text-neutral-500">
                    {new Date(group.date).toLocaleDateString()}
                  </p>
                  <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                    {group.items.map((res) => (
                      <div key={res.id}>
                        <p className="font-medium">
                          Mesa #{res.tableNumber} — {res.customerName}
                        </p>
                        <p className="text-neutral-500">
                          {res.start}–{res.end} · {res.durationMinutes} min
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-neutral-500">No hay reservaciones programadas para los próximos días.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardRoute;
