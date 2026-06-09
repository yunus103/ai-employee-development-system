# Frontend Geliştirici ve Entegrasyon Dökümanı

Bu döküman, **Yapay Zeka Destekli Bireysel Çalışan Gelişim Öneri Sistemi** projesinin frontend (Next.js) mimarisini, durum yönetimini, sayfa yapılarını ve backend API'leri ile olan entegrasyon (mapping) haritasını detaylı olarak açıklamaktadır. 

Frontend tarafında bir hata ayıklama (debug) yapmak veya sisteme yeni bir özellik eklemek istediğinizde ilk incelemeniz gereken kılavuz bu dökümandır.

---

## 1. Teknolojik Altyapı & Tasarım Sistemi

* **Framework:** Next.js (App Router, React 18, TypeScript)
* **Durum Yönetimi:** Zustand (Hafif ve hızlı global state yönetimi)
* **Grafik Kütüphanesi:** Recharts (Radar yetkinlik grafikleri için)
* **İkon Kütüphanesi:** Lucide React
* **Styling (CSS):** Vanilla CSS + Custom Global Variables (Glassmorphic, koyu/modern temalar, mikro-animasyonlar)
* **HTTP İstemcisi:** Axios (JWT Interceptor, Token Rotation ve Hata Yönetimi entegreli)

---

## 2. Dizin Yapısı & Dosya Görevleri

```text
frontend/src/
├── app/                      # Next.js Rotaları (App Router)
│   ├── dashboard/            # Panel sayfaları (Dashboard yerleşimi ve alt sayfalar)
│   │   ├── employee/         # Çalışan analiz ve plan oluşturma detay sayfası
│   │   │   └── [id]/         # Rota parametresi alan dinamik çalışan detay sayfası
│   │   ├── employee-plan/    # Çalışanın kendi gelişim planını izlediği Kanban sayfası
│   │   ├── employees/        # HR/Yönetici/Admin için çalışan arama/listeleme sayfası
│   │   ├── my-surveys/       # Çalışanın doldurması gereken 360 anketleri
│   │   ├── layout.tsx        # Dashboard ortak yan menü (sidebar) ve üst bar
│   │   └── page.tsx          # Rol bazlı dashboard yönlendirici (Dispatcher)
│   ├── login/                # Kullanıcı giriş sayfası
│   ├── globals.css           # Global CSS değişkenleri, temalar ve animasyonlar
│   ├── layout.tsx            # Ana HTML/Body yapısı ve global ToastContainer
│   └── page.tsx              # Anasayfa yönlendirme mantığı (Auth kontrolü)
├── components/               # Ortak ve rol bazlı arayüz bileşenleri
│   ├── AdminDashboard.tsx    # Admin özet paneli
│   ├── HRDashboard.tsx       # İK özet paneli
│   ├── ManagerDashboard.tsx  # Yönetici özet paneli
│   ├── EmployeeDashboard.tsx # Standart çalışan özet paneli (Radar grafikli)
│   ├── ConfirmModal.tsx      # Zustand tetiklemeli özel onay modalı
│   ├── RouteGuard.tsx        # Rota bazlı yetkilendirme ve yönlendirme koruyucusu
│   └── ToastContainer.tsx    # Zustand tetiklemeli bildirim konteyneri
├── data/                     # Statik veri ve haritalandırmalar
│   └── competency_mapping.json # Soyut yetkinlik kolonlarının departman/rol karşılıkları
├── services/                 # API Servisleri ve Mock Veritabanı
│   ├── apiClient.ts          # Axios istemcisi ve API wrapper (Mock / Real yönlendirici)
│   ├── mockApi.ts            # LocalStorage üzerinde çalışan sahte API simülasyonu
│   └── mockData.ts           # Başlangıç sahte verisi ve LocalStorage başlatıcı
├── store/                    # Zustand Store Tanımları
│   ├── useStore.ts           # Kimlik doğrulama, kullanıcı oturumu ve yüklenme durumları
│   ├── useConfirmStore.ts    # Onay modalı (ConfirmModal) durum yönetimi
│   └── useToastStore.ts      # Toast bildirim durum yönetimi
└── types/                    # TypeScript Tip Tanımlamaları
    └── index.ts              # Ortak arayüz tipleri, enum'lar ve API yanıt şablonları
```

---

## 3. Global Durum Yönetimi (Zustand Stores)

### 3.1 `useStore` (Oturum & Global Ayarlar)
Oturum açma, kapama, token yenileme ve sahte veri modu (`isMockMode`) takibini yapar.
* **State Değişkenleri:**
  * `user`: `UserSession | null` (Giriş yapmış kullanıcının detayları; rolü, `employeeId` değeri vb.)
  * `accessToken`: `string | null` (Aktif JWT Token)
  * `isAuthenticated`: `boolean` (Oturum açık mı?)
  * `isLoading`: `boolean` (Oturum kontrol ediliyor mu?)
  * `isMockMode`: `boolean` (Backend bağlantısı yerine tarayıcı hafızası mı kullanılıyor?)
* **Önemli Metotlar:**
  * `login(email, password)`: Giriş yapar, token'ları yerel hafızaya (`localStorage`) kaydeder.
  * `logout()`: Çıkış yapar ve yerel hafızayı temizler.
  * `checkAuth()`: Sayfa yenilendiğinde aktif oturumun (veya mock oturumun) geçerliliğini doğrular.
  * `refreshUser()`: Kullanıcı profilini (`/api/auth/me`) sunucudan günceller.

### 3.2 `useConfirmStore` (Onay Modalları)
Tarayıcının standart `confirm()` pencereleri yerine animasyonlu ve özelleştirilmiş modal pencereleri açmak için kullanılır.
* **Kullanım Örneği:**
  ```typescript
  useConfirmStore.getState().showConfirm({
    title: 'Değerlendirme Başlat',
    message: 'Bu çalışan için yeni bir 360° yetkinlik değerlendirmesi başlatmak istiyor musunuz?',
    confirmLabel: 'Başlat',
    onConfirm: async () => { /* ... */ }
  });
  ```

### 3.3 `useToastStore` (Bildirimler)
Uygulama içinde sağ üst köşede çıkan bildirim mesajlarını yönetir.
* **Kullanım Örneği:**
  ```typescript
  import { toast } from '../../../store/useToastStore';
  toast.success('Giriş başarılı');
  toast.error('Hata oluştu');
  ```

---

## 4. Sayfa Analizi, Fonksiyonlar & Akışlar

### 4.1 Rota Güvenliği (`RouteGuard.tsx`)
Tüm dashboard rotaları `RouteGuard` bileşeni ile sarmalanmıştır. Giriş yapmamış kullanıcıyı `/login` sayfasına yönlendirir. Ayrıca, rol bazlı kısıtlama uygulanacaksa alt bileşenlerin yüklenmesini engeller.

---

### 4.2 Giriş Sayfası (`/login`)
* **Amacı:** Kullanıcı kimlik doğrulaması.
* **Çalışma Şekli:** E-posta ve şifre bilgilerini alarak `useStore` üzerindeki `login` fonksiyonunu çağırır.
* **Mock / Real Farkı:** `isMockMode` aktifse `mock_access_token` oluşturur; pasifse gerçek `/api/auth/login` endpoint'ine istek atar.

---

### 4.3 Görev Panosu (Kanban) Rotaları

#### A) Rol Dispatcher (`/dashboard/page.tsx`)
Giriş yapan kullanıcının rolüne (`Employee`, `Manager`, `HR`, `Admin`) göre dashboard anasayfasında farklı özet panelleri gösterir:
1. **EmployeeDashboard (`Employee`):** Çalışanın kendi gelişim görevlerinin tamamlanma oranını gösterir, yetkinlik radar grafiğini çizer.
2. **ManagerDashboard (`Manager`):** Yöneticinin kendi ekibindeki çalışanları, ekibin ortalama performansını ve bekleyen anketleri özetler.
3. **HRDashboard (`HR`):** İK yöneticisine şirketteki toplam gelişim planı statülerini ve aktif değerlendirme sayılarını gösterir.
4. **AdminDashboard (`Admin`):** Sistem yöneticisi ekranı.

#### B) Bireysel Gelişim Planı Kanban Sayfası (`/dashboard/employee-plan`)
* **Amacı:** Çalışanın kendisine atanan gelişim planı aksiyonlarını (eğitimler, mentorluklar vb.) Kanban panosu formatında izlemesi ve durum güncellemesi yapması.
* **Fonksiyonlar & API Çağrıları:**
  * **Sayfa Yüklenirken:** `apiClient.tasks.getMy()` çağrılarak çalışanın gelişim görevleri listelenir (`EmployeeTask[]`).
  * **Kanban Kart Sürükleme / Durum Değiştirme:** `apiClient.tasks.updateStatus(taskId, newStatus)` çağrısı ile görevin durumu `Assigned`, `InProgress` veya `Completed` olarak güncellenir.
* **Etkileşim:** Çalışan tüm görevlerini `Completed` statüsüne getirdiğinde, backend tarafındaki tetikleyici (trigger) otomatik çalışır ve çalışanın bağlı olduğu gelişim planı durumunu otomatik olarak `Completed` yapar.

---

### 4.4 Çalışan Yönetimi ve Analizi

#### A) Çalışan Listesi (`/dashboard/employees`)
* **Amacı:** HR, Yönetici ve Admin kullanıcılarının çalışanları listelemesi, araması, departman filtresi uygulaması ve yeni değerlendirme süreçleri başlatması.
* **Fonksiyonlar & API Çağrıları:**
  * **Listeleme:** `apiClient.employees.list(page, pageSize)` ile çalışanlar sayfalanmış olarak çekilir.
  * **360° Değerlendirme Başlatma:** "360 Başlat" butonuna basıldığında `apiClient.assessments.create(employeeId, cycleId)` endpoint'i tetiklenerek yeni bir değerlendirme süreci (`Draft` statüsünde) oluşturulur.

#### B) Çalışan Detay & Analiz Sayfası (`/dashboard/employee/[id]`)
Sistemdeki en kritik sayfadır. İki farklı sekmeye (Tab) sahiptir:

##### Sekme 1: Değerlendirme & Analiz (`activeTab === 'assessment'`)
* **Rol Kısıtlamaları & Otomatik İlişki Tespiti:**
  * Giriş yapan kullanıcı ile hedef çalışan arasındaki hiyerarşik ilişki otomatik hesaplanır: `Self`, `Manager`, `Subordinate` veya `Peer`.
  * Standart çalışanlarda değerlendirici türü kilitlenir. HR veya Admin rolündeki kullanıcılar için manuel olarak değerlendirici türünü değiştirebilecekleri bir seçici (Dropdown) açılır.
* **Draft Aşamasında (Puan Girişi):**
  * Kullanıcı, 13 yetkinlik için 1.0 - 5.0 arasında puan verir.
  * `apiClient.assessments.upsertScore` ile puanlar taslak olarak kaydedilir.
  * Değerlendirme tamamlandığında `apiClient.assessments.complete(assessmentId)` tetiklenir.
* **Completed Aşamasında (AI Tetikleme & Analiz):**
  * Değerlendirme bittiğinde yetkinlik dağılım matrisi (Heatmap) ve Recharts ile çizilen 360° Radar Grafiği görünür.
  * "AI Gelişim Planı Üret" butonu belirir. Tetiklendiğinde `apiClient.actionPlans.generate(assessmentId, topK)` çağrılarak ML servisi üzerinden yapay zeka taslak gelişim planı oluşturulur.

##### Sekme 2: Aksiyon Planı (`activeTab === 'plan'`)
* **Plan Durum Yönetimi & İşlemler:**
  * **Aksiyon Güncelleme/Silme:** Plandaki maddelerin başlığı, açıklaması, önceliği (`Low`/`Medium`/`High`) ve teslim tarihi inline olarak güncellenebilir (`apiClient.actionPlans.updateItem`) veya silinebilir (`apiClient.actionPlans.deleteItem`).
  * **Manuel Görev Ekleme:** `apiClient.actionPlans.addItem` ile plana AI dışı manuel görevler eklenebilir.
  * **Onaylama:** Taslak plan İK/Yönetici tarafından onaylanır (`apiClient.actionPlans.approve`). Plan statüsü `Approved` olur.
  * **Çalışana İletme:** Onaylı plan çalışana gönderilir (`apiClient.actionPlans.send`). Bu işlemle birlikte plandaki her madde çalışanın Kanban panosuna (`/dashboard/employee-plan`) birer `EmployeeTask` olarak otomatik eklenir.
  * **PDF İndirme:** `apiClient.actionPlans.exportPdf` ile gelişim planı anlık olarak üretilen PDF raporu halinde indirilir.

---

### 4.5 Yetkinlik Değerlendirme Anketleri (`/dashboard/my-surveys`)
* **Amacı:** Çalışanın kendisi veya iş arkadaşları için doldurması gereken aktif değerlendirme anketlerini listelemesi ve puan girişlerini tamamlaması.
* **Fonksiyonlar & API Çağrıları:**
  * **Listeleme:** Giriş yapmış çalışanın doldurması gereken bekleyen anketleri çekmek için `apiClient.tasks.getMySurveys()` çağrılır. Bu liste çalışana atanmış değerlendirmeleri döner.
  * **Puan Gönderimi:** Kullanıcı puanları (1.0 - 5.0) belirler ve "Değerlendirmeyi Gönder" butonuna bastığında tek tek kaydetmek yerine `apiClient.assessments.submitBulkScores(assessmentId, scores)` çağrısı yapılarak bulk (toplu) gönderim gerçekleştirilir.
  * **Otomatik Görev Kapatma:** Toplu puan gönderildiğinde, veritabanındaki `AssessmentAssignment` görevi otomatik olarak `IsCompleted = true` yapılır. Böylece anket kullanıcının ekranından anında düşer ve mükerrer oy/anket doldurma sorunu kökten çözülür.

---

## 5. API Entegrasyon & Endpoint Mapping Tablosu

Aşağıdaki tablo, frontend servis metotlarının Swagger üzerinde hangi gerçek API rotalarına ve HTTP metotlarına eşlendiğini göstermektedir:

| Frontend Servis Grubu (`apiClient`) | Çağrılan Metot | HTTP Metodu | Gerçek Backend API Yolu (`/api/...`) | Açıklama |
|---|---|---|---|---|
| **`auth`** | `login` | **POST** | `/auth/login` | Giriş yapar, token çifti döner |
| | `logout` | **POST** | `/auth/logout` | Çıkış yapar, refresh token'ı iptal eder |
| | `getMe` | **GET** | `/auth/me` | Oturum açan kullanıcının kimlik bilgilerini çeker |
| **`employees`** | `list` | **GET** | `/employees` | Sayfalanmış çalışan listesini çeker |
| | `get` | **GET** | `/employees/{id}` | Tek bir çalışanın detaylı kartını getirir |
| | `update` | **PUT** | `/employees/{id}` | Çalışan bilgilerini günceller |
| | `getFeatures` | **GET** | `/employees/{id}/features` | Çalışanın ML model özellik vektörünü hesaplar |
| | `getAssessments` | **GET** | `/employees/{id}/assessments` | Çalışanın değerlendirme süreçlerini listeler |
| | `getActionPlans` | **GET** | `/employees/{id}/action-plans` | Çalışanın gelişim planı geçmişini getirir |
| **`assessments`** | `create` | **POST** | `/assessments` | Yeni değerlendirme döngüsü (Draft) başlatır |
| | `get` | **GET** | `/assessments/{id}` | Değerlendirme genel bilgilerini çeker |
| | `complete` | **PUT** | `/assessments/{id}/complete` | Değerlendirmeyi tamamlar, AI planlamaya açar |
| | `getScores` | **GET** | `/assessments/{id}/scores` | Değerlendirme altındaki tüm 360 skorlarını çeker |
| | `upsertScore` | **POST** | `/assessments/{id}/scores` | Tekil yetkinlik skorunu ekler/günceller |
| | `submitBulkScores` | **POST** | `/assessments/{id}/scores/bulk` | [YENİ] Bir değerlendiricinin tüm puanlarını toplu iletir |
| | `addAssignment` | **POST** | `/assessments/{id}/assignments` | [YENİ] Değerlendirme için peer/yönetici ataması yapar |
| | `listAssignments` | **GET** | `/assessments/{id}/assignments` | [YENİ] Değerlendirme atamalarını listeler |
| **`actionPlans`** | `generate` | **POST** | `/action-plans/generate` | ML tabanlı aksiyon planı taslağı üretir |
| | `get` | **GET** | `/action-plans/{id}` | Aksiyon planı kalemleri ve durumunu çeker |
| | `updateItem` | **PUT** | `/action-plans/{id}/items/{itemId}` | Plan maddesini inline düzenler |
| | `addItem` | **POST** | `/action-plans/{id}/items` | Plana manuel madde ekler |
| | `deleteItem` | **DELETE** | `/action-plans/{id}/items/{itemId}` | Plan maddesini yumuşak siler (soft delete) |
| | `approve` | **POST** | `/action-plans/{id}/approve` | Planı onaylar (`Draft` -> `Approved`) |
| | `send` | **POST** | `/action-plans/{id}/send` | Planı çalışana gönderir, Kanban görevleri oluşur |
| | `exportPdf` | **GET** | `/action-plans/{id}/export-pdf` | Gelişim planı PDF çıktısını indirir |
| **`tasks`** | `getMy` | **GET** | `/tasks/my` | Çalışanın kendi gelişim görevlerini listeler |
| | `getMySurveys` | **GET** | `/tasks/my-surveys` | [YENİ] Çalışanın doldurması gereken aktif anketleri listeler |
| | `get` | **GET** | `/tasks/{id}` | Görev detaylarını çeker |
| | `updateStatus` | **PUT** | `/tasks/{id}/status` | Görevi Kanban üzerinde taşır (`InProgress`, `Completed`) |

---

## 6. Mock API & Yerel Test Modu (`USE_MOCK`)

Uygulamanın internet bağlantısı olmadan veya bağımsız bir şekilde çalıştırılıp test edilebilmesi için gelişmiş bir Mock API katmanı mevcuttur.

* **Yapılandırma:** `frontend/.env.local` dosyası içerisindeki `NEXT_PUBLIC_USE_MOCK` değişkeni ile kontrol edilir:
  * `NEXT_PUBLIC_USE_MOCK=true` (Mock modu aktif. İstekler `mockApi.ts` ve `localStorage`'a yönlendirilir.)
  * `NEXT_PUBLIC_USE_MOCK=false` (Gerçek backend entegrasyonu aktif. İstekler `NEXT_PUBLIC_API_URL` adresine atılır.)
* **Mock Veritabanı Mekanizması (`mockData.ts` & `mockApi.ts`):**
  * Sayfa ilk yüklendiğinde, tarayıcının `localStorage` alanında `mock_employees`, `mock_assessments`, `mock_action_plans`, `mock_scores` ve `mock_tasks` anahtarları altında veri tabloları oluşturulur.
  * `mockApi.ts` içindeki fonksiyonlar gecikme (`delay`) süreleri simüle ederek bu yerel veritabanında ekleme, güncelleme ve silme işlemleri yapar.
  * Bu sayede, internete bağlı değilken bile tüm iş akışı (değerlendirme açma, puanlama, AI plan üretme simülasyonu, görev tamamlama ve otomatik plan kapanışları) tarayıcıda canlı gibi çalıştırılabilir.

---

## 7. Geliştiriciler İçin Sık Karşılaşılan Debug & İpuçları

1. **"Değerlendirme Başlatılamıyor" Hatası:**
   * Bir çalışan için yeni bir değerlendirme başlatmak istiyor ancak hata alıyorsanız, çalışanın halihazırda bitmemiş bir aksiyon planı (`Draft`, `Approved` veya `Sent` durumunda) olup olmadığını kontrol edin. İş kuralları gereği, aktif planı tamamlanmamış çalışanlar için yeni değerlendirme döngüsü başlatılamaz.
2. **Rol Değişikliklerini Test Etme:**
   * Farklı kullanıcı rollerini test etmek için `zeynep.arslan@demo.com` (Standart çalışan) ve diğer İK / Yönetici hesapları arasında hızlıca geçiş yapabilirsiniz. Tarayıcı local storage alanını temizleyip sayfayı yenilemek mock verileri başlangıç durumuna döndürecektir.
3. **Yeni Yetkinlik Eklemek:**
   * Yetkinlik listesine yeni bir kalem eklenmesi gerektiğinde, hem `competenciesMetadata` dizilerine (id: 14 vb.) ekleme yapılmalı hem de `competency_mapping.json` dosyasına karşılık gelen rol/departman etiketleri işlenmelidir.
