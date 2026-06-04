'use client';

import { useToastStore, ToastType } from '../store/useToastStore';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const colors: Record<ToastType, { border: string; text: string; bg: string; icon: string }> = {
  success: {
    border: 'border-l-success/80',
    text: 'text-success',
    bg: 'bg-success/5',
    icon: 'text-success'
  },
  error: {
    border: 'border-l-danger/80',
    text: 'text-danger',
    bg: 'bg-danger/5',
    icon: 'text-danger'
  },
  warning: {
    border: 'border-l-warning/80',
    text: 'text-warning',
    bg: 'bg-warning/5',
    icon: 'text-warning'
  },
  info: {
    border: 'border-l-primary/80',
    text: 'text-primary',
    bg: 'bg-primary/5',
    icon: 'text-primary'
  }
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col space-y-3.5 max-w-md w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          const color = colors[toast.type];

          return (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`pointer-events-auto flex items-start space-x-3.5 rounded-2xl border border-card-border/60 bg-card/90 ${color.bg} ${color.border} border-l-4 p-4 shadow-xl backdrop-blur-md`}
            >
              {/* Icon */}
              <div className={`mt-0.5 shrink-0 ${color.icon}`}>
                <Icon className="h-5 w-5" />
              </div>

              {/* Message */}
              <div className="flex-1 text-xs font-semibold leading-relaxed text-foreground">
                {toast.message}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-muted hover:text-foreground transition duration-150 rounded-lg p-0.5 hover:bg-card-border/50"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
