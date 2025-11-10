import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, getTablesAvailability } from '../lib/api';
import CustomerSearch from './CustomerSearch';
import { Customer, TableAvailability } from '../types';
import { cn } from '../lib/ui';

interface Props {
  onSuccess?: () => void;
}

const todayISO = new Date().toISOString().slice(0, 10);

const normalizeDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return trimmed;
};

const normalizeTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)$/i);
  if (match) {
    let hour = Number(match[1]);
    const minutes = match[2];
    const meridiem = match[3].toLowerCase().includes('p') ? 'pm' : 'am';
    if (meridiem === 'pm' && hour < 12) {
      hour += 12;
    }
    if (meridiem === 'am' && hour === 12) {
      hour = 0;
    }
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  }
  return trimmed;
};

const ReservationForm = ({ onSuccess }: Props) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    date: todayISO,
    time: '18:00',
    people: 2,
    notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tablesStatus, setTablesStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableAvailability[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');

  const normalizedQuery = useMemo(() => {
    return {
      date: normalizeDate(form.date),
      time: normalizeTime(form.time),
      people: Math.max(1, Number.isFinite(form.people) ? form.people : 1),
    };
  }, [form.date, form.time, form.people]);

  useEffect(() => {
    if (!normalizedQuery.date || !normalizedQuery.time) {
      setTables([]);
      setTablesStatus('idle');
      return;
    }
    const controller = new AbortController();
    setTablesStatus('loading');
    setTablesError(null);
    getTablesAvailability(normalizedQuery, controller.signal)
      .then(({ data }) => {
        setTables(data);
        setTablesStatus('idle');
        setSelectedTableId((current) =>
          data.some((table) => table.id === current) ? current : '',
        );
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setTablesStatus('error');
        setTablesError(err?.response?.data?.message ?? 'No se pudo obtener la disponibilidad');
        setTables([]);
        setSelectedTableId('');
      });
    return () => controller.abort();
  }, [normalizedQuery]);

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    if (!customer) {
      setError('Selecciona un cliente');
      return;
    }
    if (!selectedTableId) {
      setError('Selecciona una mesa disponible');
      return;
    }
    if (!normalizedQuery.date || !normalizedQuery.time) {
      setError('Completa fecha y hora validas');
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      await api.post('/reservations', {
        customerId: customer.id,
        tableId: selectedTableId,
        people: normalizedQuery.people,
        startsAt: `${normalizedQuery.date}T${normalizedQuery.time}:00.000Z`,
        notes: form.notes,
      });
      setStatus('idle');
      onSuccess?.();
    } catch (err: unknown) {
      setStatus('error');
      type ErrorWithResponse = {
        response?: { data?: { message?: string } };
      };
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as ErrorWithResponse).response?.data?.message
          : null;
      setError(message ?? 'No se pudo crear la reserva');
    }
  };

  const handleTableSelect = (tableId: string, disabled: boolean) => {
    if (disabled) return;
    setSelectedTableId(tableId);
    setError(null);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <CustomerSearch onSelect={setCustomer} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-neutral-600">
          Fecha
          <input
            type="text"
            inputMode="numeric"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            placeholder="YYYY-MM-DD o DD/MM/AAAA"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Hora
          <input
            type="text"
            value={form.time}
            onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
            placeholder="HH:mm o hh:mm p. m."
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Personas
          <input
            type="number"
            min={1}
            value={form.people}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, people: Number(e.target.value) || 1 }))
            }
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
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-600">Mesas disponibles</p>
          <span className="text-xs text-neutral-500">
            {tables.length} mesa{tables.length === 1 ? '' : 's'} listas
          </span>
        </div>
        <div className="mt-2 rounded-2xl border border-neutral-200 bg-white/70 shadow-inner">
          <div className="max-h-[260px] space-y-2 overflow-y-auto p-3">
            {tablesStatus === 'loading' && (
              <p className="text-sm text-neutral-500">Consultando disponibilidad...</p>
            )}
            {tablesStatus === 'error' && tablesError && (
              <p className="text-sm text-red-500">{tablesError}</p>
            )}
            {tablesStatus === 'idle' && tables.length === 0 && (
              <p className="text-sm text-neutral-500">No hay mesas disponibles para este horario.</p>
            )}
            {tables.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {tables.map((table) => {
                  const disabled =
                    table.status === 'OCCUPIED' || table.capacity < normalizedQuery.people;
                  const selected = selectedTableId === table.id;
                  return (
                    <button
                      type="button"
                      key={table.id}
                      onClick={() => handleTableSelect(table.id, disabled)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left text-sm transition',
                        disabled
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:border-brand hover:bg-amber-50',
                        selected ? 'border-brand bg-amber-50 ring-2 ring-brand/40' : 'border-neutral-200 bg-white'
                      )}
                    >
                      <p className="text-base font-semibold">
                        {table.name ?? (table.number ? `Mesa #${table.number}` : 'Mesa disponible')}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Capacidad {table.capacity} · {table.status === 'AVAILABLE' ? 'Libre' : 'Ocupada'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={status === 'saving' || !selectedTableId}
        className="rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {status === 'saving' ? 'Guardando...' : 'Crear reserva'}
      </button>
    </form>
  );
};

export default ReservationForm;
