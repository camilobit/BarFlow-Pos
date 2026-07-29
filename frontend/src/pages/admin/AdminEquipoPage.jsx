import { useEffect, useState, useCallback } from 'react';
import { Plus, KeyRound, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usuariosApi, negociosApi, barrasApi } from '../../services/endpoints.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import Modal from '../../components/common/Modal.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const ROLES = [
  { valor: 'admin_negocio', etiqueta: 'Administrador' },
  { valor: 'barra', etiqueta: 'Barra' },
  { valor: 'mesero', etiqueta: 'Mesero' },
];

const FORM_VACIO = { nombre: '', apellido: '', email: '', password: '', rol: 'admin_negocio', pin: '', barra_id: '' };

export default function AdminEquipoPage() {
  const { perfil } = useAuth();
  const esSuperAdmin = perfil.rol === 'super_admin';

  const [usuarios, setUsuarios] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [barras, setBarras] = useState([]);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalResetear, setModalResetear] = useState(null); // usuario seleccionado, o null
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [form, setForm] = useState(FORM_VACIO);

  // Un super_admin no tiene negocio propio (negocio_id = null) — necesita
  // elegir de cuál negocio quiere ver/crear el equipo.
  useEffect(() => {
    if (esSuperAdmin) {
      negociosApi.listar().then((lista) => {
        setNegocios(lista);
        if (lista.length) setNegocioSeleccionado((prev) => prev || lista[0].id);
      });
    }
  }, [esSuperAdmin]);

  const negocioActivo = esSuperAdmin ? negocioSeleccionado : perfil.negocio_id;

  useEffect(() => {
    if (negocioActivo) barrasApi.listar(esSuperAdmin ? negocioActivo : undefined).then(setBarras);
  }, [negocioActivo, esSuperAdmin]);

  const cargar = useCallback(async () => {
    if (!negocioActivo) {
      setUsuarios([]);
      return;
    }
    setUsuarios(await usuariosApi.listar(negocioActivo));
  }, [negocioActivo]);

  useEffect(() => { cargar(); }, [cargar]);

  async function crearUsuario(e) {
    e.preventDefault();
    try {
      const payload = { ...form, negocio_id: negocioActivo, barra_id: form.rol === 'barra' ? form.barra_id || null : null };
      if (!payload.pin) delete payload.pin; // '' no es un PIN válido, mejor no enviarlo
      await usuariosApi.crear(payload);
      toast.success('Empleado creado. Ya puede iniciar sesión con su correo y contraseña.');
      setModalAbierto(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function desactivar(usuario) {
    if (!confirm(`¿Desactivar a ${usuario.nombre}? Ya no podrá iniciar sesión.`)) return;
    await usuariosApi.desactivar(usuario.id);
    cargar();
  }

  async function activar(usuario) {
    await usuariosApi.actualizar(usuario.id, { activo: true });
    toast.success(`${usuario.nombre} reactivado`);
    cargar();
  }

  async function eliminarPermanente(usuario) {
    if (!confirm(`¿Eliminar a "${usuario.nombre}" para siempre y liberar su correo? Solo se puede si nunca tuvo actividad.`)) return;
    try {
      await usuariosApi.eliminarPermanente(usuario.id);
      toast.success('Empleado eliminado. Su correo ya está disponible de nuevo.');
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function resetearPassword(e) {
    e.preventDefault();
    try {
      await usuariosApi.resetearPassword(modalResetear.id, nuevaPassword);
      toast.success(`Contraseña actualizada. Avísale a ${modalResetear.nombre} su nueva clave.`);
      setModalResetear(null);
      setNuevaPassword('');
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!usuarios) return <LoadingScreen />;

  const nombreNegocioActivo = negocios.find((n) => n.id === negocioActivo)?.nombre;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Equipo</h1>
          <p className="text-sm text-mist-500">
            {esSuperAdmin ? 'Administradores, barra y meseros por negocio' : 'Meseros, barra y administradores'}
          </p>
        </div>
        <button onClick={() => setModalAbierto(true)} disabled={!negocioActivo} className="btn-primary">
          <Plus size={16} /> Nuevo empleado
        </button>
      </div>

      {esSuperAdmin && (
        <div className="card p-4">
          <label className="mb-1.5 block text-xs font-semibold text-mist-500">Negocio</label>
          {negocios.length === 0 ? (
            <p className="text-sm text-mist-500">
              Todavía no has creado ningún negocio. Ve a <strong>Negocios</strong> en el menú para crear el primero.
            </p>
          ) : (
            <select className="input" value={negocioActivo || ''} onChange={(e) => setNegocioSeleccionado(e.target.value)}>
              {negocios.map((n) => (
                <option key={n.id} value={n.id}>{n.nombre} — {n.ciudad || 'sin ciudad'}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-mist-400">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-mist-100 last:border-0">
                <td className="px-4 py-3 font-medium text-ink-900">{u.nombre} {u.apellido}</td>
                <td className="px-4 py-3 text-mist-500">{u.email}</td>
                <td className="px-4 py-3 capitalize text-ink-800">
                  {u.rol.replace('_', ' ')}
                  {u.rol === 'barra' && u.barra?.nombre && <span className="ml-1 text-xs text-mist-500">({u.barra.nombre})</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.activo ? 'bg-petrol-100 text-petrol-700' : 'bg-mist-100 text-mist-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    {u.activo ? (
                      <>
                        <button onClick={() => setModalResetear(u)} className="flex items-center gap-1 text-xs font-semibold text-petrol-600 hover:underline">
                          <KeyRound size={13} /> Resetear clave
                        </button>
                        <button onClick={() => desactivar(u)} className="text-xs font-semibold text-red-500 hover:underline">
                          Desactivar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => activar(u)} className="text-xs font-semibold text-petrol-600 hover:underline">
                        Activar
                      </button>
                    )}
                    <button onClick={() => eliminarPermanente(u)} className="text-mist-400 hover:text-red-500" title="Eliminar para siempre">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-mist-500">
                  {negocioActivo ? 'Este negocio todavía no tiene empleados.' : 'Selecciona un negocio para ver su equipo.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <Modal title={esSuperAdmin ? `Nuevo empleado para ${nombreNegocioActivo || ''}` : 'Nuevo empleado'} onClose={() => setModalAbierto(false)}>
          <form onSubmit={crearUsuario} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Nombre</label>
                <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Apellido</label>
                <input className="input" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Correo</label>
              <input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Contraseña temporal</label>
              <input required type="password" minLength={6} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Rol</label>
              <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
              </select>
            </div>
            {form.rol === 'barra' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-mist-500">Barra asignada (correo fijo de esa caja)</label>
                <select className="input" value={form.barra_id} onChange={(e) => setForm({ ...form, barra_id: e.target.value })}>
                  <option value="">Sin asignar (puede elegir al entrar)</option>
                  {barras.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="btn-primary w-full">Crear empleado</button>
          </form>
        </Modal>
      )}

      {modalResetear && (
        <Modal title={`Resetear contraseña de ${modalResetear.nombre}`} onClose={() => setModalResetear(null)}>
          <form onSubmit={resetearPassword} className="space-y-3">
            <p className="text-xs text-mist-500">
              Ponle una contraseña temporal nueva y avísale al empleado por fuera de la app (WhatsApp, en persona, etc.) — no se envía ningún correo.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Contraseña nueva</label>
              <input required type="password" minLength={6} className="input" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} autoFocus />
            </div>
            <button type="submit" className="btn-primary w-full">Actualizar contraseña</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
