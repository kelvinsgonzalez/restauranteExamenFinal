import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Reservation } from '../types';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { toast } from 'sonner';
import MapWidget from '../components/MapWidget';

const fetchOccupancy = async () => {
  const { data } = await api.get('/reports/occupancy', {
    params: { range: 'day', date: new Date().toISOString().slice(0, 10) },
  });
  return data;
};

const fetchTodayReservations = async (): Promise<Reservation[]> => {
  const { data } = await api.get('/reservations/today');
  return data;
};

const DashboardRoute = () => {
  const { data: occupancy } = useQuery({
    queryKey: ['reports', 'occupancy'],
    queryFn: fetchOccupancy,
    refetchInterval: 60_000,
  });
  const { data: today } = useQuery({
    queryKey: ['reservations', 'today'],
    queryFn: fetchTodayReservations,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const socket = connectSocket();
    socket.on('reservation.created', (payload) => {
      toast.success('Nueva reserva creada', {
        description: `${payload?.customer?.fullName ?? 'Cliente'} - Mesa ${payload?.table?.number ?? ''}`,
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
          <p className="text-3xl font-semibold">{occupancy?.occupancyPct ?? 0}%</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-sm text-neutral-500">Reservas hoy</p>
          <p className="text-3xl font-semibold">{today?.length ?? 0}</p>
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
            {today?.map((res) => (
              <div key={res.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">Mesa #{res.table?.number}</p>
                  <p className="text-neutral-500">
                    {new Date(res.startsAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs uppercase">{res.status}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="glass-panel p-6">
          <h2 className="mb-4 text-xl font-semibold">Ubicación</h2>
          <MapWidget />
        </section>
      </div>
    </div>
  );
};

export default DashboardRoute;
