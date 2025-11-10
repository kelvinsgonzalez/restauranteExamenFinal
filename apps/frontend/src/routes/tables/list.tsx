import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Table } from '../../types';
import TableCard from '../../components/TableCard';
import { useNavigate } from 'react-router-dom';

const fetchTables = async (): Promise<Table[]> => {
  const { data } = await api.get('/tables');
  return data;
};

const TablesListRoute = () => {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['tables'], queryFn: fetchTables });
  const [form, setForm] = useState({ number: '', capacity: 4, location: 'salón' });
  const mutation = useMutation({
    mutationFn: () =>
      api.post('/tables', {
        number: Number(form.number),
        capacity: Number(form.capacity),
        location: form.location,
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['tables'] });
      setForm({ number: '', capacity: 4, location: 'salón' });
    },
  });

  const handleSubmit = (evt: FormEvent) => {
    evt.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
      <section className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Mesas</h2>
            <p className="text-sm text-neutral-500">Administra la capacidad del restaurante</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {data?.map((table) => (
            <TableCard key={table.id} table={table} onToggle={() => navigate(`/tables/${table.id}`)} />
          ))}
        </div>
      </section>
      <aside className="glass-panel p-6">
        <h3 className="text-lg font-semibold">Agregar mesa</h3>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-neutral-600">
            Número
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
            Ubicación
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
