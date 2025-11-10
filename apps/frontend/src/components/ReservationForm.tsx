import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import CustomerSearch from './CustomerSearch';
import { AvailabilityResponse, Customer } from '../types';

interface Props {
  onSuccess?: () => void;
}

const todayISO = new Date().toISOString().slice(0, 10);

const ReservationForm = ({ onSuccess }: Props) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    date: todayISO,
    time: '18:00',
    people: 2,
    notes: '',
    tableId: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const { data: availability } = useQuery<AvailabilityResponse>({
    queryKey: ['availability', form.date, form.time, form.people],
    enabled: !!form.date && !!form.time,
    queryFn: async () => {
      const { data } = await api.get('/availability', {
        params: {
          date: form.date,
          time: form.time,
          people: form.people,
        },
      });
      return data;
    },
  });

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    if (!customer) {
      setError('Selecciona un cliente');
      return;
    }
    if (!form.tableId) {
      setError('Selecciona una mesa disponible');
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      await api.post('/reservations', {
        customerId: customer.id,
        tableId: form.tableId,
        people: form.people,
        startsAt: `${form.date}T${form.time}:00.000Z`,
        notes: form.notes,
      });
      setStatus('idle');
      onSuccess?.();
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.message ?? 'No se pudo crear la reserva');
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <CustomerSearch onSelect={setCustomer} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-neutral-600">
          Fecha
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Hora
          <input
            type="time"
            value={form.time}
            onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Personas
          <input
            type="number"
            min={1}
            value={form.people}
            onChange={(e) => setForm((prev) => ({ ...prev, people: Number(e.target.value) }))}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Notas
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
      </div>
      <div>
        <p className="text-sm font-semibold text-neutral-600">Mesas disponibles</p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {availability?.available?.map((table) => (
            <label
              key={table.id}
              className={`flex cursor-pointer justify-between rounded-lg border px-4 py-3 text-sm shadow-sm ${
                form.tableId === table.id ? 'border-brand bg-orange-50' : 'border-neutral-200'
              }`}
            >
              <span>
                Mesa #{table.number}
                <span className="block text-xs text-neutral-500">{table.capacity} personas · {table.location}</span>
              </span>
              <input
                type="radio"
                checked={form.tableId === table.id}
                onChange={() => setForm((prev) => ({ ...prev, tableId: table.id }))}
              />
            </label>
          ))}
        </div>
        {availability?.available?.length === 0 && (
          <p className="mt-2 text-sm text-neutral-500">
            Sin mesas disponibles. Considera estos horarios sugeridos:
            <span className="ml-2 font-medium">
              {availability?.suggestions.map((s) => new Date(s.startsAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })).join(', ')}
            </span>
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={status === 'saving'}
        className="rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {status === 'saving' ? 'Guardando...' : 'Crear reserva'}
      </button>
    </form>
  );
};

export default ReservationForm;
