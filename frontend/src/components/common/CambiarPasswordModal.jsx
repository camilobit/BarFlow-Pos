import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient.js';

// Cambia la contraseña de la sesión actual — no necesita backend propio,
// Supabase Auth ya lo soporta directo desde el cliente. Sirve igual para
// mesero, barra o admin: cada quien cambia SU PROPIA contraseña estando
// ya logueado.
export default function CambiarPasswordModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    if (password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirmacion) return toast.error('Las contraseñas no coinciden.');

    setEnviando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Contraseña actualizada');
      onClose();
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-950/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">Cambiar mi contraseña</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-mist-100"><X size={20} /></button>
        </div>
        <form onSubmit={guardar} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-mist-500">Contraseña nueva</label>
            <input required type="password" minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-mist-500">Confirmar contraseña</label>
            <input required type="password" minLength={6} className="input" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          </div>
          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
