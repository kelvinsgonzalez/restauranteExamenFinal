import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, deleteReservation } from '../../lib/api';
import { Reservation } from '../../types';

const fetchReservations = async (status: string): Promise<Reservation[]> => {
  const { data } = await api.get('/reservations', {
    params: status ? { status } : undefined,
  });
  return data;
};

const ReservationListRoute = () => {
  const [status, setStatus] = useState('');
  const client = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['reservations', status],
    queryFn: () => fetchReservations(status),
  });

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'confirm' | 'cancel' }) =>
      api.post(`/reservations/${id}/${action}`),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['reservations'] });
      client.invalidateQueries({ queryKey: ['reservations', 'today'] });
      client.invalidateQueries({ queryKey: ['dashboard', 'overview'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      deleteReservation(id, { force }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['reservations'] });
      client.invalidateQueries({ queryKey: ['reservations', 'today'] });
      client.invalidateQueries({ queryKey: ['dashboard', 'overview'] });
    },
  });

  const handleDelete = (reservation: Reservation) => {
    const endDate = reservation.endsAt ?? reservation.startsAt;
    const isPast = new Date(endDate).getTime() <= Date.now();
    const confirmed = window.confirm(
      isPast
        ? 'Esta reserva ya finalizó. ¿Deseas eliminarla definitivamente?'
        : 'La reserva aún no ha sucedido. ¿Eliminarla de todos modos?',
    );
    if (!confirmed) return;
    deleteMutation.mutate({ id: reservation.id, force: !isPast });
  };

  return (
    <section className="glass-panel p-6">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Listado de reservas</h2>
          <p className="text-sm text-neutral-500">Filtra por estado y administra tiempos</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="PENDING">Pendientes</option>
          <option value="CONFIRMED">Confirmadas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
      </div>
      {isLoading && <p>Cargando reservas...</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-neutral-500">
              <th className="py-2">Cliente</th>
              <th>Hora</th>
              <th>Mesa</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((res) => (
              <tr key={res.id} className="border-t border-neutral-100">
                <td className="py-3">
                  <p className="font-medium">{res.customer?.fullName}</p>
                  <p className="text-xs text-neutral-500">{res.customer?.email}</p>
                </td>
                <td>
                  {new Date(res.startsAt).toLocaleString('es-GT', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                  })}
                </td>
                <td>Mesa #{res.table?.number}</td>
                <td>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs uppercase">{res.status}</span>
                </td>
                <td className="space-x-2">
                  <button
                    className="text-xs font-semibold text-green-600 disabled:opacity-50"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: res.id, action: 'confirm' })}
                  >
                    Confirmar
                  </button>
                  <button
                    className="text-xs font-semibold text-red-500 disabled:opacity-50"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ id: res.id, action: 'cancel' })}
                  >
                    Cancelar
                  </button>
                  <button
                    className="text-xs font-semibold text-neutral-500 disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(res)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ReservationListRoute;
