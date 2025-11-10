import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Customer } from '../types';

interface Props {
  onSelect: (customer: Customer) => void;
}

const CustomerSearch = ({ onSelect }: Props) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data } = await api.get('/customers', { params: { q: query } });
      setResults(data);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-600">
        Cliente
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca por nombre o email"
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
        />
      </label>
      {results.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          {results.map((customer) => (
            <button
              type="button"
              key={customer.id}
              onClick={() => {
                onSelect(customer);
                setQuery(customer.fullName);
                setResults([]);
              }}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-neutral-50"
            >
              <p className="font-medium">{customer.fullName}</p>
              <p className="text-xs text-neutral-500">{customer.email ?? 'sin correo'}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
