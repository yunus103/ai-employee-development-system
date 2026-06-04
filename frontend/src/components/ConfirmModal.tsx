'use client';

import { useConfirmStore } from '../store/useConfirmStore';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

export default function ConfirmModal() {
  const { isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onCancel } = useConfirmStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            className="relative w-full max-w-sm rounded-3xl border border-card-border/60 bg-card/90 p-6 shadow-2xl backdrop-blur-md space-y-5 text-center"
          >
            {/* Warning Icon wrapper */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-info/10 text-info border border-info/20">
              <HelpCircle className="h-7 w-7" />
            </div>

            {/* Content text */}
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-foreground">{title}</h4>
              <p className="text-xs text-muted leading-relaxed px-2">{message}</p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-card-border bg-background hover:bg-card-border/40 py-2.5 text-xs font-semibold text-muted hover:text-foreground transition duration-150"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-xl bg-primary hover:bg-primary-hover py-2.5 text-xs font-semibold text-white shadow-lg shadow-primary/25 transition duration-150"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
