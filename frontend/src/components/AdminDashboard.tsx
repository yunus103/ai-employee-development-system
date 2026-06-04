'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '../store/useStore';
import { Users, Database, Activity, RefreshCw } from 'lucide-react';
import { initializeMockDatabase } from '../services/mockData';
import { toast } from '../store/useToastStore';
import { useConfirmStore } from '../store/useConfirmStore';

export default function AdminDashboard() {
  const router = useRouter();
  const { isMockMode } = useStore();

  const handleResetDatabase = () => {
    useConfirmStore.getState().showConfirm({
      title: 'Veritabanını Sıfırla',
      message: 'Tüm mock veritabanını sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.',
      confirmLabel: 'Sıfırla',
      cancelLabel: 'İptal',
      onConfirm: () => {
        localStorage.clear();
        initializeMockDatabase();
        toast.success('Veritabanı sıfırlandı ve varsayılan veriler yüklendi.');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome */}
      <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8">
        <h3 className="text-xl md:text-2xl font-bold text-foreground">Sistem Yönetim Portalı (Admin)</h3>
        <p className="mt-2 text-sm text-muted">
          Sistem ayarlarını güncelleyebilir, çalışanları yönetebilir ve veritabanı sıfırlama işlemlerini yapabilirsiniz.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Reset DB Card */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 text-warning">
              <Database className="h-6 w-6" />
              <h4 className="text-base font-bold text-foreground">Veri Yönetimi</h4>
            </div>
            <p className="text-xs text-muted mt-2">
              Yerel tarayıcı üzerindeki (Mock) veritabanı durumunu temizleyip varsayılan seed değerlerine sıfırlayın.
            </p>
          </div>
          <button
            onClick={handleResetDatabase}
            className="mt-6 flex w-full items-center justify-center space-x-2 rounded-xl bg-warning hover:bg-warning/80 py-3 text-xs font-semibold text-white transition duration-150"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Mock DB Sıfırla</span>
          </button>
        </div>

        {/* Manage Employees Card */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 text-info">
              <Users className="h-6 w-6" />
              <h4 className="text-base font-bold text-foreground">Çalışan Yönetimi</h4>
            </div>
            <p className="text-xs text-muted mt-2">
              Sisteme yeni çalışanlar ekleyin veya mevcut çalışanların rollerini ve yöneticilerini güncelleyin.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/employees')}
            className="mt-6 flex w-full items-center justify-center space-x-2 rounded-xl bg-info hover:bg-info/80 py-3 text-xs font-semibold text-white transition duration-150"
          >
            <Users className="h-4 w-4" />
            <span>Kullanıcıları Yönet</span>
          </button>
        </div>

        {/* System Settings */}
        <div className="glass-panel rounded-2xl p-6 border border-card-border flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 text-primary">
              <Activity className="h-6 w-6" />
              <h4 className="text-base font-bold text-foreground">Çalışma Modu</h4>
            </div>
            <p className="text-xs text-muted mt-2">
              Sistem çalışma modu: {isMockMode ? 'Çevrimdışı (Mock Veri Simülasyonu)' : 'Canlı sunucu entegrasyonu (.NET Core API)'}
            </p>
          </div>
          <div className="mt-6 flex items-center justify-center rounded-xl bg-card border border-card-border py-3 text-xs text-muted">
            {isMockMode ? 'MOCK MODU ETKİN' : 'CANLI SUNUCU BAĞLI'}
          </div>
        </div>
      </div>
    </div>
  );
}
