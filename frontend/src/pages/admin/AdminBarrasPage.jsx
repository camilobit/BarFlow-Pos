import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import { barrasApi } from '../../services/endpoints.js';
import Modal from '../../components/common/Modal.jsx';
import LoadingScreen from '../../components/common/LoadingScreen.jsx';

const FORM_VACIO = { nombre: '', descripcion: '' };

export default function AdminBarrasPage() {
  const [barras, setBarras] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null); // barra en edición, o null si es nueva
  const [form, setForm] = useState(FORM_VACIO);

  const cargar = useCallback(async () => setBarras(await barrasApi.listar()), []);
  useEffect(() => { cargar(); }, [cargar]);

  function abrirNueva() {
    setEditando(null);
    setForm(FORM_VACIO);
    setModalAbierto(true);
  }

  function abrirEditar(barra) {
    setEditando(barra);
    setForm({ nombre: barra.nombre, descripcion: barra.descripcion || '' });
    setModalAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    try {
      if (editando) {
        await barrasApi.actualizar(editando.id, form);
        toast.success('Barra actualizada');
      } else {
        await barrasApi.crear(form);
        toast.success('Barra creada');
      }
      setModalAbierto(false);
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function toggleActiva(barra) {
    await barrasApi.actualizar(barra.id, { activa: !barra.activa });
    cargar();
  }

  async function eliminar(barra) {
    if (!confirm(`¿Eliminar "${barra.nombre}"? Solo se puede si nunca tuvo pedidos.`)) return;
    try {
      await barrasApi.eliminar(barra.id);
      toast.success('Barra eliminada');
      cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!barras) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Barras</h1>
          <p className="text-sm text-mist-500">Puntos de despacho de tu negocio — cada una con su propia caja e inventario</p>
        </div>
        <button onClick={abrirNueva} className="btn-primary"><Plus size={16} /> Nueva barra</button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {barras.map((b) => (
          <div key={b.id} className={`card p-4 ${!b.activa && 'opacity-60'}`}>
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="font-display text-base font-bold text-ink-900">{b.nombre}</p>
                {b.descripcion && <p className="text-xs text-mist-500">{b.descripcion}</p>}
              </div>
              <span className={`badge ${b.activa ? 'bg-petrol-100 text-petrol-700' : 'bg-mist-100 text-mist-500'}`}>
                {b.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => abrirEditar(b)} className="btn-secondary !px-2.5 !py-1.5 text-xs"><Pencil size={13} /> Editar</button>
              <button onClick={() => toggleActiva(b)} className="btn-secondary !px-2.5 !py-1.5 text-xs">
                <Power size={13} /> {b.activa ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => eliminar(b)} className="ml-auto rounded-lg p-1.5 text-mist-400 hover:bg-red-50 hover:text-red-500">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
        {barras.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-mist-500">Todavía no has creado ninguna barra.</p>
        )}
      </div>

      {modalAbierto && (
        <Modal title={editando ? `Editar "${editando.nombre}"` : 'Nueva barra'} onClose={() => setModalAbierto(false)}>
          <form onSubmit={guardar} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Nombre</label>
              <input required className="input" placeholder="Ej. Vortex, Cantina, VIP" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-mist-500">Descripción (opcional)</label>
              <input className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full">{editando ? 'Guardar cambios' : 'Crear barra'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
