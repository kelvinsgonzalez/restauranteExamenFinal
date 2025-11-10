import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/auth-provider';

const credentials = { email: 'chef@restaurante.com', password: 'Chef2024!' };

const LoginRoute = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(credentials);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(form.email, form.password);
      navigate('/', { replace: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      try {
        setError?.(msg);
      } catch (_) {
        // ignore
      }
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,.4),_transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom,_rgba(14,165,233,.3),_transparent_45%)]" />
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-10 rounded-[32px] border border-white/10 bg-white/5 p-10 shadow-[0_20px_60px_rgba(15,23,42,.65)] backdrop-blur-3xl lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Restaurante Familiar</p>
            <h1 className="text-4xl font-semibold leading-tight text-white">Gestiona reservas con estilo</h1>
            <p className="text-base text-white/80">
              Un panel pensado para equipos que necesitan un flujo claro para recibir clientes, asignar mesas y revisar métricas sin distracciones.
            </p>
            <div className="space-y-3 rounded-2xl border border-white/20 bg-white/5 p-4 text-sm text-white/80">
              <p className="text-white/90">Prueba estas credenciales demo para ingresar:</p>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-white/10 px-3 py-1 text-amber-200">chef@restaurante.com</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-amber-200">Chef2024!</span>
              </div>
            </div>
            <div className="text-sm text-white/60">
              <p>¿Necesitas otro perfil? Pide al administrador un usuario personalizado o ejecuta el seed en el backend.</p>
            </div>
          </div>
          <div className="space-y-6 rounded-3xl border border-white/20 bg-slate-900/70 p-8 shadow-2xl">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Acceso seguro</p>
              <h2 className="text-2xl font-semibold text-white">Inicia sesión</h2>
              <p className="text-sm text-slate-400">Administra mesas, reservas y turnos desde un tablero moderno.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block text-sm font-medium text-slate-300">
                Correo del equipo
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition focus:border-amber-300 focus:outline-none"
                  placeholder="chef@example.com"
                />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Contraseña segura
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition focus:border-amber-300 focus:outline-none"
                  placeholder="••••••••"
                />
              </label>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-950 transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? 'Ingresando...' : 'Entrar ahora'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginRoute;
