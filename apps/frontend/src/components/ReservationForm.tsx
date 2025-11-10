import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import CustomerSearch from './CustomerSearch';
import { cn } from '../lib/ui';
import {
  createReservation,
  getAvailability,
  getSlotSuggestions,
} from '../lib/api';
import { Customer, SlotSuggestion, TableAvailability } from '../types';

interface Props {
  onSuccess?: () => void;
}

const DEFAULT_TIME = '18:00';
const getTodayISO = () => new Date().toISOString().slice(0, 10);

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
    const isPm = match[3].toLowerCase().includes('p');
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  }
  return trimmed;
};

type ErrorWithResponse = {
  response?: { data?: { message?: string }; status?: number };
  message?: string;
};

const extractErrorMessage = (err: unknown) => {
  if (err && typeof err === 'object') {
    const typed = err as ErrorWithResponse;
    return typed.response?.data?.message ?? typed.message ?? null;
  }
  return null;
};

const extractStatusCode = (err: unknown) => {
  if (err && typeof err === 'object' && 'response' in err) {
    return (err as ErrorWithResponse).response?.status;
  }
  return undefined;
};

const ReservationForm = ({ onSuccess }: Props) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerKey, setCustomerKey] = useState(0);
  const [form, setForm] = useState({
    date: getTodayISO(),
    time: DEFAULT_TIME,
    people: 2,
    notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableAvailability[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [suggestionStatus, setSuggestionStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle');
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([]);

  const normalizedQuery = useMemo(() => {
    return {
      date: normalizeDate(form.date),
      time: normalizeTime(form.time),
      people: Math.max(1, Number.isFinite(form.people) ? form.people : 1),
    };
  }, [form]);

  useEffect(() => {
    setSelectedTableId('');
    if (!normalizedQuery.date || !normalizedQuery.time) {
      setTables([]);
      setAvailabilityStatus('idle');
      return;
    }
    const controller = new AbortController();
    setAvailabilityStatus('loading');
    setAvailabilityError(null);
    getAvailability(
      {
        date: normalizedQuery.date,
        time: normalizedQuery.time,
        people: normalizedQuery.people,
      },
      controller.signal,
    )
      .then((data) => {
        setTables(data);
        setAvailabilityStatus('idle');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setAvailabilityStatus('error');
        setAvailabilityError(extractErrorMessage(err) ?? 'No se pudo obtener mesas');
        setTables([]);
      });
    return () => controller.abort();
  }, [normalizedQuery.date, normalizedQuery.time, normalizedQuery.people]);

  useEffect(() => {
    if (!normalizedQuery.date) {
      setSuggestions([]);
      setSuggestionStatus('idle');
      return;
    }
    const controller = new AbortController();
    setSuggestionStatus('loading');
    setSuggestionError(null);
    getSlotSuggestions(
      {
        date: normalizedQuery.date,
        people: normalizedQuery.people,
      },
      controller.signal,
    )
      .then((data) => {
        setSuggestions(data);
        setSuggestionStatus('idle');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setSuggestionStatus('error');
        setSuggestionError(extractErrorMessage(err) ?? 'No se pudieron calcular las sugerencias');
        setSuggestions([]);
      });
    return () => controller.abort();
  }, [normalizedQuery.date, normalizedQuery.people]);

  const handleFieldChange = (
    field: 'date' | 'time' | 'people' | 'notes',
    value: string | number,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'date' || field === 'time' || field === 'people') {
      setSelectedTableId('');
    }
  };

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
      setError('Completa fecha y hora válidas');
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      await createReservation({
        clientId: customer.id,
        tableId: selectedTableId,
        date: normalizedQuery.date,
        time: normalizedQuery.time,
        people: normalizedQuery.people,
        notes: form.notes.trim() || undefined,
      });
      toast.success('Reserva creada.');
      const resetDate = getTodayISO();
      setCustomer(null);
      setCustomerKey((prev) => prev + 1);
      setForm({ date: resetDate, time: DEFAULT_TIME, people: 2, notes: '' });
      setSelectedTableId('');
      setTables([]);
      setStatus('idle');
      onSuccess?.();
    } catch (err) {
      const statusCode = extractStatusCode(err);
      const message =
        statusCode === 409
          ? 'La mesa fue tomada en este horario. Elige otra.'
          : extractErrorMessage(err) ?? 'No se pudo crear la reserva';
      setStatus('error');
      setError(message);
      toast.error(message);
    }
  };

  const isSubmitDisabled =
    status === 'saving' ||
    !customer ||
    !selectedTableId ||
    !normalizedQuery.date ||
    !normalizedQuery.time;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <CustomerSearch key={customerKey} onSelect={setCustomer} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-neutral-600">
          Fecha
          <input
            type="date"
            value={form.date}
            onChange={(e) => handleFieldChange('date', e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Hora
          <input
            type="time"
            value={form.time}
            onChange={(e) => handleFieldChange('time', e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestionStatus === 'loading' && (
              <p className="text-xs text-neutral-500">Calculando sugerencias...</p>
            )}
            {suggestionStatus === 'error' && suggestionError && (
              <p className="text-xs text-red-500">{suggestionError}</p>
            )}
            {suggestionStatus === 'idle' && suggestions.length === 0 && (
              <p className="text-xs text-neutral-500">Sin sugerencias disponibles.</p>
            )}
            {suggestions.map((slot) => (
              <button
                key={slot.time}
                type="button"
                title={`${slot.available} mesas disponibles`}
                onClick={() => handleFieldChange('time', slot.time)}
                disabled={slot.available === 0}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition',
                  slot.time === form.time
                    ? 'border-brand bg-amber-100 text-brand'
                    : 'border-neutral-200 bg-white text-neutral-700',
                  slot.available === 0 && 'cursor-not-allowed opacity-50',
                )}
              >
                {slot.time} · {slot.available}
              </button>
            ))}
          </div>
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Personas
          <input
            type="number"
            min={1}
            value={form.people}
            onChange={(e) =>
              handleFieldChange('people', Number(e.target.value) || 1)
            }
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-neutral-600">
          Notas
          <input
            type="text"
            value={form.notes}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
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
            {availabilityStatus === 'loading' && (
              <p className="text-sm text-neutral-500">Buscando mesas...</p>
            )}
            {availabilityStatus === 'error' && availabilityError && (
              <p className="text-sm text-red-500">{availabilityError}</p>
            )}
            {availabilityStatus === 'idle' && tables.length === 0 && (
              <p className="text-sm text-neutral-500">
                Sin mesas para ese horario. Prueba otra sugerencia.
              </p>
            )}
            {tables.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {tables.map((table) => {
                  const disabled =
                    table.capacity < normalizedQuery.people ||
                    table.status !== 'AVAILABLE';
                  const selected = selectedTableId === table.id;
                  return (
                    <button
                      type="button"
                      key={table.id}
                      onClick={() => (!disabled ? setSelectedTableId(table.id) : null)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left text-sm transition',
                        disabled
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:border-brand hover:bg-amber-50',
                        selected ? 'border-brand bg-amber-50 ring-2 ring-brand/40' : 'border-neutral-200 bg-white',
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
        disabled={isSubmitDisabled}
        className="rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {status === 'saving' ? 'Guardando...' : 'Crear reserva'}
      </button>
    </form>
  );
};

export default ReservationForm;
