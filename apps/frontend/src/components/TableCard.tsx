import { Table } from '../types';

interface Props {
  table: Table;
  onToggle?: (table: Table) => void;
}

const TableCard = ({ table, onToggle }: Props) => (
  <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-lg font-semibold">Mesa #{table.number}</p>
        <p className="text-sm text-neutral-500">
          {table.capacity} personas · {table.location}
        </p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          table.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'
        }`}
      >
        {table.isActive ? 'Activa' : 'Inactiva'}
      </span>
    </div>
    {onToggle && (
      <button
        onClick={() => onToggle(table)}
        className="mt-4 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
      >
        Editar mesa
      </button>
    )}
  </div>
);

export default TableCard;
