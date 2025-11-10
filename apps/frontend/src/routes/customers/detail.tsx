import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Customer, Reservation } from '../../types';

const fetchCustomer = async (id: string): Promise<Customer> => {
  const { data } = await api.get(`/customers/${id}`);
  return data;
};

const fetchHistory = async (id: string): Promise<Reservation[]> => {
  const { data } = await api.get(`/customers/${id}/history`);
  return data;
};

const CustomerDetailRoute = () => {
  const { id } = useParams();
  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    enabled: Boolean(id),
    queryFn: () => fetchCustomer(id as string),
  });
  const { data: history } = useQuery({
    queryKey: ['customer', id, 'history'],
    enabled: Boolean(id),
    queryFn: () => fetchHistory(id as string),
  });

  if (!customer) {
    return <p className="glass-panel p-6">Cargando...</p>;
  }

  return (
    <section className="glass-panel p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">{customer.fullName}</h2>
        <p className="text-sm text-neutral-500">{customer.email ?? 'Sin correo'} · {customer.phone ?? 'Sin teléfono'}</p>
      </div>
      <div className="rounded-xl border border-neutral-200 p-4">
        <p className="text-sm text-neutral-500">Historial</p>
        <ul className="divide-y text-sm">
          {history?.map((reservation) => (
            <li key={reservation.id} className="py-3">
              <p className="font-medium">
                Mesa #{reservation.table?.number} · {reservation.people} personas
              </p>
              <p className="text-neutral-500">
                {new Date(reservation.startsAt).toLocaleString('es-GT', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · '}
                {reservation.status}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default CustomerDetailRoute;
