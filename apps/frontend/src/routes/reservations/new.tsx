import ReservationForm from '../../components/ReservationForm';
import { useQueryClient } from '@tanstack/react-query';

const ReservationNewRoute = () => {
  const client = useQueryClient();
  return (
    <section className="glass-panel space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">Nueva reserva</h2>
        <p className="text-sm text-neutral-500">
          Consulta disponibilidad en tiempo real y confirma en segundos.
        </p>
      </div>
      <ReservationForm
        onSuccess={() => {
          client.invalidateQueries({ queryKey: ['reservations'] });
          client.invalidateQueries({ queryKey: ['reservations', 'today'] });
        }}
      />
    </section>
  );
};

export default ReservationNewRoute;
