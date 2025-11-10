import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Table } from '../../types';
import { useEffect, useState } from 'react';

const fetchTable = async (id: string): Promise<Table> => {
  const { data } = await api.get(`/tables/${id}`);
  return data;
};

const TableEditRoute = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: ['table', id],
    enabled: Boolean(id),
    queryFn: () => fetchTable(id as string),
  });
  const [form, setForm] = useState<Table | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: Partial<Table>) => api.patch(`/tables/${id}`, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['tables'] });
      navigate('/tables');
    },
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  if (!id) return null;
  if (!data || !form) return <p className="glass-panel p-6">Cargando...</p>;

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    if (form) {
      mutation.mutate({
        capacity: form.capacity,
        location: form.location,
        isActive: form.isActive,
      });
    }
  };

  return (
    <section className="glass-panel p-6">
      <h2 className="text-2xl font-semibold">Editar mesa #{data.number}</h2>
      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="text-sm font-medium text-neutral-600">
          Capacidad
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => setForm((prev) => ({ ...prev!, capacity: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Ubicación
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev!, location: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-600">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev!, isActive: e.target.checked }))}
          />
          Activa
        </label>
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={mutation.isPending}
        >
          Guardar cambios
        </button>
      </form>
    </section>
  );
};

export default TableEditRoute;
