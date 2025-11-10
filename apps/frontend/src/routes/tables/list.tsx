import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getTablesOccupancy } from '../../lib/api';
import { TableOccupancy } from '../../types';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/ui';
import { connectSocket, disconnectSocket } from '../../lib/socket';

const getNowFilters = () => {
  const now = new Date();
  return {
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
  };
};

const TablesListRoute = () => {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(getNowFilters);
  const [form, setForm] = useState({ number: '', capacity: 4, location: 'salon' });

  const { data: occupancy, isPending } = useQuery({
    queryKey: ['tables', 'occupancy', filters.date, filters.time],
    queryFn: ({ signal }) => getTablesOccupancy({ ...filters, signal }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/tables', {
        number: Number(form.number),
        capacity: Number(form.capacity),
        location: form.location,
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['tables', 'occupancy'] });
      setForm({ number: '', capacity: 4, location: 'salon' });
    },
  });

  useEffect(() => {
    const socket = connectSocket();
    const handler = () => {
      client.invalidateQueries({ queryKey: ['tables', 'occupancy'] });
    };
    socket.on('tables.occupancyChanged', handler);
    socket.connect();
    return () => {
      socket.off('tables.occupancyChanged', handler);
      disconnectSocket();
    };
  }, [client]);

  const handleSubmit = (evt: FormEvent) => {
    evt.preventDefault();
    mutation.mutate();
  };

  const handleFilterChange = (field: 'date' | 'time', value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetFilters = () => {
    setFilters(getNowFilters());
  };

  const handleRefresh = () => {
    client.invalidateQueries({ queryKey: ['tables', 'occupancy', filters.date, filters.time] });
  };

  const renderCard = (table: TableOccupancy) => {
    const occupied = table.status === 'OCCUPIED';
    return (
      <button
        key={table.tableId}
        type="button"
        onClick={() => (!occupied ? navigate(`/tables/${table.tableId}`) : undefined)}
        disabled={occupied}
        className={cn(
          'w-full rounded-2xl border px-4 py-4 text-left transition',
          occupied
            ? 'cursor-not-allowed border-red-200 bg-red-50 text-red-700'
            : 'border-neutral-200 bg-white text-neutral-700 hover:border-brand hover:bg-amber-50',
        )}
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Mesa #{table.tableNumber}</p>
          {occupied && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase text-red-700">
              Ocupada
              {table.until ? (
                <>
                  {' hasta '}
                  {table.until}
                </>
              ) : null}
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-500">Capacidad {table.capacity} personas</p>
        {table.customerName && occupied && (
          <p className="text-xs text-neutral-500">Reservado por {table.customerName}</p>
        )}
      </button>
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
      <section className="glass-panel p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Mesas</h2>
            <p className="text-sm text-neutral-500">Consulta disponibilidad en tiempo real</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-md border border-neutral-200 px-3 py-1"
            >
              Ahora
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-md border border-neutral-200 px-3 py-1"
            >
              Actualizar
            </button>
          </div>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <label className="text-sm font-medium text-neutral-600">
            Fecha
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-neutral-600">
            Hora
            <input
              type="time"
              value={filters.time}
              onChange={(e) => handleFilterChange('time', e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
            />
          </label>
        </form>
        <div className="grid gap-4 md:grid-cols-2">
          {isPending && <p className="text-sm text-neutral-500">Cargando...</p>}
          {!isPending && occupancy?.length === 0 && (
            <p className="text-sm text-neutral-500">No hay mesas registradas.</p>
          )}
          {!isPending && occupancy?.map((table) => renderCard(table))}
        </div>
      </section>
      <aside className="glass-panel p-6">
        <h3 className="text-lg font-semibold">Agregar mesa</h3>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-neutral-600">
            Numero
            <input
              type="number"
              value={form.number}
              onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm font-medium text-neutral-600">
            Capacidad
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm font-medium text-neutral-600">
            Ubicacion
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Guardando...' : 'Crear mesa'}
          </button>
        </form>
      </aside>
    </div>
  );
};

export default TablesListRoute;
