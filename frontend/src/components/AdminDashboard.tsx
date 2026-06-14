'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Users, Database, Activity, RefreshCw } from 'lucide-react';
import { initializeMockDatabase } from '../services/mockData';
import { toast } from '../store/useToastStore';
import { useConfirmStore } from '../store/useConfirmStore';
import { apiClient } from '../services/apiClient';

export default function AdminDashboard() {
  const router = useRouter();
  const { isMockMode } = useStore();
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDatabase = () => {
    useConfirmStore.getState().showConfirm({
      title: 'Veritabanını Sıfırla (Mock)',
      message: 'Tüm mock verilerini sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.',
      confirmLabel: 'Sıfırla',
      cancelLabel: 'İptal',
      onConfirm: () => {
        localStorage.clear();
        initializeMockDatabase();
        toast.success('Mock veritabanı sıfırlandı ve varsayılan veriler yüklendi.');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });
  };

  const handleLiveReset = async () => {
    if (confirmationInput !== 'RESET') {
      toast.error("Lütfen onay için 'RESET' yazın.");
      return;
    }
    setIsResetting(true);
    try {
      const res = await apiClient.admin.resetData('RESET');
      if (res.success) {
        toast.success(res.message || 'Veritabanı başarıyla sıfırlandı.');
        setShowResetModal(false);
        setConfirmationInput('');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(res.message || 'Sıfırlama işlemi başarısız oldu.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Bir hata oluştu.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetAction = () => {
    if (isMockMode) {
      handleResetDatabase();
    } else {
      setShowResetModal(true);
    }
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
              {isMockMode 
                ? 'Yerel tarayıcı üzerindeki (Mock) veritabanı durumunu temizleyip varsayılan seed değerlerine sıfırlayın.'
                : 'Canlı veritabanındaki tüm anket, gelişim planı ve görev verilerini temizleyip sıfırlayın.'}
            </p>
          </div>
          <button
            onClick={handleResetAction}
            className="mt-6 flex w-full items-center justify-center space-x-2 rounded-xl bg-warning hover:bg-warning/80 py-3 text-xs font-semibold text-white transition duration-150"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{isMockMode ? 'Mock DB Sıfırla' : 'Veritabanını Sıfırla'}</span>
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

      {/* Reset Confirmation Modal for Live Mode */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => !isResetting && setShowResetModal(false)} 
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
          />
          {/* Modal Container */}
          <div className="relative w-full max-w-md rounded-3xl border border-card-border/60 bg-card/90 p-6 shadow-2xl backdrop-blur-md space-y-5 text-center z-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10 text-warning border border-warning/20">
              <Database className="h-7 w-7" />
            </div>
            
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-foreground">Canlı Veritabanını Sıfırla</h4>
              <p className="text-xs text-muted leading-relaxed px-2">
                Bu işlem tüm değerlendirme süreçlerini, puanları, aksiyon planlarını, çalışan görevlerini ve yorumları <strong>kalıcı olarak silecektir</strong>.<br />
                Kullanıcılar, çalışanlar, yetkinlikler ve diğer referans verileri korunacaktır.
              </p>
              <p className="text-xs text-warning font-semibold">
                Devam etmek için lütfen aşağıdaki kutuya <strong>RESET</strong> yazın:
              </p>
            </div>

            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="RESET"
              disabled={isResetting}
              className="w-full text-center tracking-widest uppercase rounded-xl border border-card-border bg-background/50 focus:border-warning focus:ring-1 focus:ring-warning py-2.5 px-4 text-sm font-bold text-foreground placeholder:text-muted/50 outline-none transition duration-150"
            />

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="rounded-xl border border-card-border bg-background hover:bg-card-border/40 py-2.5 text-xs font-semibold text-muted hover:text-foreground transition duration-150 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleLiveReset}
                disabled={isResetting || confirmationInput !== 'RESET'}
                className="rounded-xl bg-warning hover:bg-warning/80 py-2.5 text-xs font-semibold text-white shadow-lg shadow-warning/25 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isResetting ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sıfırlanıyor...</span>
                  </>
                ) : (
                  <span>Verileri Sil</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
