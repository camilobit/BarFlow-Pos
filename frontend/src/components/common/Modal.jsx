import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-4">
      <div className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-mist-100">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
