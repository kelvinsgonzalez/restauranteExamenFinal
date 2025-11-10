import { createBrowserRouter, Navigate, Outlet, RouterProvider, NavLink } from 'react-router-dom';
import { useAuth } from './providers/auth-provider';
import HomeRoute from './routes/index';
import LoginRoute from './routes/login';
import DashboardRoute from './routes/dashboard';
import ReservationNewRoute from './routes/reservations/new';
import ReservationListRoute from './routes/reservations/list';
import TablesListRoute from './routes/tables/list';
import TableEditRoute from './routes/tables/edit';
import CustomersListRoute from './routes/customers/list';
import CustomerDetailRoute from './routes/customers/detail';
import { cn } from './lib/ui';

const ProtectedLayout = () => {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const menu = [
    { to: '/', label: 'Calendario' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/reservations', label: 'Reservas' },
    { to: '/reservations/new', label: 'Nueva reserva' },
    { to: '/tables', label: 'Mesas' },
    { to: '/customers', label: 'Clientes' },
  ];
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div>
          <p className="text-xs uppercase text-neutral-500">Restaurante Familiar</p>
          <p className="text-lg font-semibold">Panel de reservas</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">{user.email}</span>
          <button
            onClick={logout}
            className="rounded-md border border-neutral-200 px-3 py-1 text-sm hover:bg-neutral-100"
          >
            Salir
          </button>
        </div>
      </header>
      <div className="grid gap-6 p-6 lg:grid-cols-[220px,1fr]">
        <nav className="glass-panel p-4 space-y-2">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand text-white'
                    : 'text-neutral-600 hover:bg-neutral-100',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'dashboard', element: <DashboardRoute /> },
      { path: 'reservations/new', element: <ReservationNewRoute /> },
      { path: 'reservations', element: <ReservationListRoute /> },
      { path: 'tables', element: <TablesListRoute /> },
      { path: 'tables/:id', element: <TableEditRoute /> },
      { path: 'customers', element: <CustomersListRoute /> },
      { path: 'customers/:id', element: <CustomerDetailRoute /> },
    ],
  },
  {
    path: '/login',
    element: <LoginRoute />,
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
