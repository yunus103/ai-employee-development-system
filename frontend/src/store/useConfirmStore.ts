import { create } from 'zustand';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  showConfirm: (options: ConfirmOptions) => void;
  close: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  title: 'Onay Gerekiyor',
  message: '',
  confirmLabel: 'Evet',
  cancelLabel: 'İptal',
  onConfirm: () => {},
  onCancel: () => {},
  showConfirm: ({
    title = 'Onay Gerekiyor',
    message,
    confirmLabel = 'Evet',
    cancelLabel = 'İptal',
    onConfirm,
    onCancel
  }) => {
    set({
      isOpen: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      onConfirm: () => {
        onConfirm();
        set({ isOpen: false });
      },
      onCancel: () => {
        if (onCancel) onCancel();
        set({ isOpen: false });
      }
    });
  },
  close: () => set({ isOpen: false })
}));
