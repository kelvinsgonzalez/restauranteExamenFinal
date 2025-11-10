import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { Customer } from '../../types';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

const CustomersListRoute = () => {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editForms, setEditForms] = useState<
    Record<string, { fullName: string; email: string; phone: string }>
  >({});

  const fetchCustomers = async (search = '') => {
    const { data } = await api.get('/customers', {
      params: search ? { q: search } : undefined,
    });
    setCustomers(data);
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchCustomers(query).catch(() => setCustomers([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    fetchCustomers().catch(() => setCustomers([]));
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/customers', {
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone || undefined,
      }),
    onSuccess: () => {
      setForm({ fullName: '', email: '', phone: '' });
      setError(null);
      fetchCustomers(query).catch(() => setCustomers([]));
    },
    onError: (err: any) => {
      setError(err.response?.data?.message ?? 'No se pudo crear el cliente');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.patch(`/customers/${id}`, payload),
    onSuccess: () => {
      setActionError(null);
      fetchCustomers(query).catch(() => setCustomers([]));
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message ?? 'No se pudo actualizar el cliente');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      setActionError(null);
      if (expandedId) {
        setExpandedId(null);
      }
      fetchCustomers(query).catch(() => setCustomers([]));
    },
    onError: () => setActionError('No se pudo eliminar el cliente'),
  });

  useEffect(() => {
    if (!expandedId) return;
    const current = customers.find((c) => c.id === expandedId);
    if (current) {
      setEditForms((prev) => ({
        ...prev,
        [expandedId]: {
          fullName: current.fullName,
          email: current.email ?? '',
          phone: current.phone ?? '',
        },
      }));
    }
  }, [customers, expandedId]);

  const handleToggle = (customer: Customer) => {
    setEditForms((prev) =>
      prev[customer.id]
        ? prev
        : {
            ...prev,
            [customer.id]: {
              fullName: customer.fullName,
              email: customer.email ?? '',
              phone: customer.phone ?? '',
            },
          },
    );
    setExpandedId((prev) => (prev === customer.id ? null : customer.id));
  };

  const handleEditChange = (
    id: string,
    field: 'fullName' | 'email' | 'phone',
    value: string,
  ) => {
    setEditForms((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleUpdate = (id: string) => {
    const payload = editForms[id];
    if (!payload?.fullName.trim()) {
      setActionError('El nombre es obligatorio');
      return;
    }
    updateMutation.mutate({
      id,
      payload: {
        fullName: payload.fullName,
        email: payload.email || null,
        phone: payload.phone || null,
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    const confirmed = window.confirm(`¿Eliminar a ${name}? Esta acción es permanente.`);
    if (!confirmed) return;
    deleteMutation.mutate(id);
  };

  const sortedCustomers = useMemo(
    () =>
      [...customers].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' }),
      ),
    [customers],
  );

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!form.fullName.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    mutation.mutate();
  };

  return (
    <section className="glass-panel p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-neutral-500">Historial y datos de contacto</p>
        </div>
        <input
          type="search"
          placeholder="Buscar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-2"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <div className="space-y-3 max-h-[640px] overflow-y-auto pr-2">
          {sortedCustomers.map((customer) => {
            const open = expandedId === customer.id;
            const edit = editForms[customer.id] ?? {
              fullName: customer.fullName,
              email: customer.email ?? '',
              phone: customer.phone ?? '',
            };
            return (
              <div
                key={customer.id}
                className="rounded-2xl border border-neutral-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold capitalize leading-tight">
                      {customer.fullName}
                    </p>
                    <p className="text-sm text-neutral-500">{customer.email ?? 'Sin correo'}</p>
                    <p className="text-xs text-neutral-400">
                      Tel: {customer.phone ?? 'Sin teléfono'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggle(customer)}
                      className="rounded-lg border border-neutral-200 px-3 py-1 text-sm font-medium"
                    >
                      {open ? 'Cerrar edición' : 'Editar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(customer.id, customer.fullName)}
                      disabled={deleteMutation.isPending && expandedId === customer.id}
                      className="rounded-lg border border-red-200 px-3 py-1 text-sm font-medium text-red-600 disabled:opacity-50"
                    >
                      {deleteMutation.isPending && expandedId === customer.id
                        ? 'Eliminando...'
                        : 'Eliminar'}
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="border-t border-neutral-100 px-4 py-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-medium text-neutral-600">
                        Nombre completo
                        <input
                          type="text"
                          value={edit.fullName}
                          onChange={(e) =>
                            handleEditChange(customer.id, 'fullName', e.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                        />
                      </label>
                      <label className="text-sm font-medium text-neutral-600">
                        Correo
                        <input
                          type="email"
                          value={edit.email}
                          onChange={(e) =>
                            handleEditChange(customer.id, 'email', e.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                        />
                      </label>
                      <label className="text-sm font-medium text-neutral-600">
                        Teléfono
                        <input
                          type="tel"
                          value={edit.phone}
                          onChange={(e) =>
                            handleEditChange(customer.id, 'phone', e.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                        />
                      </label>
                    </div>
                    {actionError && <p className="text-sm text-red-500">{actionError}</p>}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdate(customer.id)}
                        disabled={updateMutation.isPending && expandedId === customer.id}
                        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {updateMutation.isPending && expandedId === customer.id
                          ? 'Guardando...'
                          : 'Guardar cambios'}
                      </button>
                      <Link
                        to={`/customers/${customer.id}`}
                        className="text-sm font-medium text-brand underline"
                      >
                        Ver historial
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!customers.length && (
            <p className="text-sm text-neutral-500">No hay clientes registrados.</p>
          )}
        </div>

        <aside className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Agregar cliente</h3>
          <p className="text-sm text-neutral-500">Captura rápida para nuevas reservas.</p>
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-neutral-600">
              Nombre completo *
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm font-medium text-neutral-600">
              Correo
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                placeholder="cliente@correo.com"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-600">
              Teléfono
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                placeholder="+502 5555 5555"
              />
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-lg bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {mutation.isPending ? 'Guardando...' : 'Registrar cliente'}
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
};

export default CustomersListRoute;
