import { useQuery } from '@tanstack/react-query';
import Calendar from '../components/Calendar';
import { api } from '../lib/api';
import { Reservation } from '../types';
import { formatDay } from '../utils/date';

const fetchToday = async (): Promise<Reservation[]> => {
  const { data } = await api.get('/reservations/today');
  return data;
};

const HomeRoute = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['reservations', 'today'],
    queryFn: fetchToday,
    refetchInterval: 30_000,
  });

  return (
    <section className="glass-panel p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">Reservas del día</p>
          <h2 className="text-2xl font-semibold">{formatDay(new Date().toISOString())}</h2>
        </div>
      </div>
      {isLoading && <p>Cargando calendario...</p>}
      {data && <Calendar reservations={data} />}
    </section>
  );
};

export default HomeRoute;
