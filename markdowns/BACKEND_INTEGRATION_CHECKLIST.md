# Backend Entegrasyon ve Kontrol Listesi (Checklist)

Bu döküman, **Yapay Zeka Destekli Bireysel Çalışan Gelişim Öneri Sistemi** projesinde frontend ile backend arasındaki yetkilendirme, iş kuralları ve veri tutarlılığı entegrasyonunun eksiksiz tamamlanabilmesi amacıyla hazırlanmıştır.

Backend ekibinin (veya entegrasyonu yapacak agent'ın) sistem veritabanını, yetkilendirme kurallarını ve API endpoint davranışlarını test edip eksikleri gidermesi için bu kontrol listesini kullanması gerekmektedir.

---

## 1. Genel Çalışma Mantığı ve Yaşam Döngüsü (Lifecycle)

Sistem, çalışanların 360° yetkinlik analizlerini toplayıp, bu analizlerden ML (Machine Learning) modeli aracılığıyla aksiyon planı üreten ve bu planları Kanban görevleri olarak çalışana atayan uçtan uca bir akışa sahiptir.

### A) 360° Değerlendirme Döngüsü

1. **Süreci Başlatma:** HR veya Manager, bir çalışan için değerlendirme süreci başlatır (`POST /api/assessments`).
2. **Otomatik Atamalar (Assignments):** Değerlendirme başlatıldığında, sistem veritabanına otomatik olarak iki adet atama (`AssessmentAssignment`) eklemelidir:
   - **`Self`:** Çalışanın kendisi için öz değerlendirme ataması.
   - **`Manager`:** Çalışanın yöneticisi (`managerId`) için yönetici değerlendirme ataması.
3. **Manuel Atamalar:** HR veya Admin, sürece ek değerlendiriciler (meslektaş/akran - `Peer`, ast - `Subordinate`) atayabilir (`POST /api/assessments/{id}/assignments`).
4. **Puanlama (Anket Doldurma):**
   - Çalışanlar bekleyen anketlerini `/api/tasks/my-surveys` üzerinden görür.
   - Puanları toplu gönderdiklerinde (`POST /api/assessments/{id}/scores/bulk`), ilgili atama (`AssessmentAssignment`) veritabanında otomatik olarak `isCompleted = true` yapılır.
5. **Döngünün Kapanması:**
   - **Otomatik Kapanış:** Atanan tüm değerlendiriciler anketlerini tamamladığında, değerlendirme durumu otomatik olarak `Completed` olur.
   - **Manuel/Zorla Kapanış (Bypass):** Değerlendiriciler puan girmeyi geciktirdiğinde, Admin veya HR **"360° Sürecini Tamamla (Kapat)"** butonuna basarak süreci manuel sonlandırabilir (`PUT /api/assessments/{id}/complete`). Bu işlem eksik atamaları bypass eder ve mevcut puanların ortalamasını alarak durumu `Completed` yapar.

### B) Gelişim Planı ve Kanban Görev Döngüsü

1. **Plan Üretme:** Değerlendirme `Completed` olduktan sonra, ML servisi tetiklenerek taslak plan üretilir (`POST /api/action-plans/generate`). Plan statüsü `Draft` olur.
2. **Düzenleme:** HR veya Manager, plandaki aksiyonları düzenleyebilir, silebilir veya manuel aksiyon ekleyebilir. Plan statüsü `Edited` olur.
3. **Onaylama:** Plan yetkili tarafından onaylanır (`POST /api/action-plans/{id}/approve`). Statü `Approved` olur.
4. **Çalışana Gönderme:** Plan çalışana iletilir (`POST /api/action-plans/{id}/send`). Statü `Sent` olur. Bu tetikleme ile birlikte, plandaki her aksiyon maddesi çalışanın Kanban görev tablosuna birer `EmployeeTask` olarak otomatik kopyalanır (`status = Pending`).
5. **Kanban Takibi:** Çalışan görevlerini `InProgress` veya `Completed` olarak günceller (`PUT /api/tasks/{id}/status`).
6. **Otomatik Plan Tamamlanma:** Plandaki tüm görevler çalışan tarafından `Completed` yapıldığında, bağlı olduğu gelişim planı (`ActionPlan`) statüsü de veritabanında otomatik olarak `Completed` olur.

---

## 2. Rol & Yetki Matrisi (Role & Authorization Matrix)

| Rol          | Çalışan Listesi Görme (`GET /employees`) | 360 Süreci Başlatma (`POST /assessments`) | Değerlendirme Kapatma (`PUT /complete`) | Puan Girişi / Düzenleme       | Gelişim Planı Yönetimi (AI/Manuel) | Kendi Kanban Görevleri |
| ------------ | ---------------------------------------- | ----------------------------------------- | --------------------------------------- | ----------------------------- | ---------------------------------- | ---------------------- |
| **Admin**    | ✅ Tüm Şirket                            | ❌ (Gerek yok)                            | ✅ Evet (Bypass)                        | ✅ Temsili (Tüm Roller Adına) | ❌ (Gerek yok)                     | ❌ Hayır               |
| **HR**       | ✅ Tüm Şirket                            | ✅ Evet                                   | ✅ Evet (Bypass)                        | ✅ Temsili (Tüm Roller Adına) | ✅ Evet (Tüm Şirket)               | ❌ Hayır               |
| **Manager**  | ✅ Kendi Ekibiyle Sınırlı                | ✅ Kendi Ekibi İçin                       | ❌ Hayır                                | ✅ Sadece "Manager" Puanı     | ✅ Sadece Kendi Ekibi              | ❌ Hayır               |
| **Employee** | ❌ Hayır                                 | ❌ Hayır                                  | ❌ Hayır                                | ✅ Sadece Kendi Anketi        | ❌ Hayır                           | ✅ Evet                |

### Özel Yetki Kuralları:

1. **İK & Admin "Temsili Veri Girişi" (Proxy/God Mode):**
   - HR ve Admin kullanıcıları, bir çalışanın değerlendirme sayfasındayken dropdown üzerinden **Öz, Yönetici, Akran, Ast** rollerinden birini seçerek onlar adına puan girişi (`POST /api/assessments/{id}/scores`) yapabilir.
   - Sunucu, HR/Admin'in başkası adına puan eklemesini engellememeli, bu istekleri _"Bu değerlendirme için atama bulunamadı"_ hatası fırlatmadan kabul etmelidir.
2. **Yönetici Sınırları (Manager Scope):**
   - Yöneticiler (`Manager` rolü), yalnızca `managerId = [kendi_employee_id]` olan çalışanların listesini görebilmeli ve sadece onlar için 360° süreci başlatabilmelidir. Diğer departman veya çalışanların verilerine erişmeye çalıştıklarında `403 Forbidden` dönmelidir (oturum kapatmaya sebep olmamak için `401 Unauthorized` dönülmemelidir).

---

## 3. Yapay Zeka (ML) Entegrasyonu & İş Kuralları

### A) Dinamik Önceliklendirme (Priority Fallback Sorunu)

- **Sorun:** Daha önceki testlerde, AI aksiyon planı oluşturulduğunda tüm gelişim maddelerinin önceliği sabit olarak `Medium` (Orta) olarak gelmekteydi. Bu durum model çıktısının veya veritabanı varsayılan alanının (fallback) hatalı/sabit olmasından kaynaklanmaktadır.
- **Beklenen Davranış:**
  - ML modeli, çalışanın zayıf olduğu yetkinliklerin derecesine göre öncelikleri dinamik olarak belirlemelidir (örneğin; puanı en düşük olan 1-3 yetkinliğe ait aksiyonlar **High**, orta derecedekiler **Medium**, nispeten daha iyi durumdakiler **Low** öncelikli olarak set edilmelidir).
  - Backend, ML servisinden (`https://bitirme-ml.onrender.com`) aldığı öncelik verisini (`Low`, `Medium`, `High`) doğrudan plandaki ilgili item'lara yazmalıdır, statik bir varsayılan değerle ezmemelidir.

### B) ML Entegrasyon Akışı & Veri Yapısı

- `POST /api/action-plans/generate` isteği tetiklendiğinde:
  1. Backend sunucusu ilgili `assessmentId` üzerinden çalışanın tüm yetkinlik puan ortalamalarını derlemelidir.
  2. Derlenen bu ML özellik vektörünü (`GET /api/employees/{id}/features` ile dönen şemada olduğu gibi) ML servisine (`https://bitirme-ml.onrender.com`) POST etmelidir.
  3. ML servisinden dönen JSON yanıtındaki aksiyon önerileri (`title`, `description`, `resource`, `deliveryType`, `priority`) taranarak gelişim planı maddeleri (`ActionPlanItem`) olarak kaydedilmelidir.
  4. Önerilen aksiyonların kaynağı veritabanında `source = "AI"` olarak set edilmeli, manuel eklenen aksiyonlar için ise `source = "Manual"` kullanılmalıdır.
  5. **Hata Toleransı (Circuit Breaker):** ML servisinin çevrimdışı olması veya 503 dönmesi durumunda, sistem çökmek yerine İK paneline _"Gelişim planı öneri servisine şu anda ulaşılamıyor, lütfen daha sonra tekrar deneyin"_ mesajı dönmelidir.

---

## 4. PDF Rapor Oluşturma ve Yazdırma Kuralları

- **Endpoint:** `GET /api/action-plans/{id}/export-pdf`
- **Beklenen Davranış ve Çıktı Standartları:**
  1. **Tüm Aksiyonların Listelenmesi:** Raporda, aksiyon planındaki tüm maddeler (hem AI tarafından önerilmiş olanlar hem de sonradan İK/Yönetici tarafından manuel eklenmiş olan görevler) eksiksiz yer almalıdır.
  2. **Gelişmiş Sıralama Mantığı:** Aksiyon maddeleri PDF üzerinde rastgele değil, öncelik derecesine göre azalan şekilde (Önce **Yüksek (High)**, sonra **Orta (Medium)** ve en son **Düşük (Low)**) ve tamamlanma durumlarına göre gruplanarak yazdırılmalıdır.
  3. **Türkçe Karakter Uyumluluğu:** PDF çıktısında `ı, ş, ğ, ç, ö, ü, İ, Ş, Ğ, Ç, Ö, Ü` karakterlerinin bozulmaması (font tanımlamalarının UTF-8 ve Türkçe uyumlu Arial/Inter gibi yazı tiplerini içermesi) kritik önem taşımaktadır.
  4. **Profil Bilgileri Entegrasyonu:** Raporun üst bilgisinde (Header) çalışanın adı soyadı, çalışan kodu, departmanı, pozisyonu ve yöneticisinin ismi mutlaka yer almalıdır.
  5. **Dosya Akışı:** PDF dosyası sunucu diskinde fiziksel olarak saklanmamalıdır. HTTP Response stream üzerinden dynamic byte buffer olarak dönmeli ve `Content-Disposition: attachment; filename=aksiyon-plani-{id}.pdf` header'ları eklenerek doğrudan tarayıcıya indirilmesi sağlanmalıdır.

---

## 5. Detaylı Endpoint Kontrol Listesi ve Davranışları

### 5.1 Auth Modülü

- [ ] **`POST /api/auth/login`**
  - E-posta ve şifre ile giriş yapar, JWT Token çifti döner (`accessToken`, `refreshToken`).
  - Demo/Test kullanıcılarının şifresi standart `Demo1234!` veya `Hr1234!` / `Admin1234!` olarak belirlenmelidir.
- [ ] **`POST /api/auth/refresh`**
  - Gönderilen valid `refreshToken` ile yeni bir `accessToken` üretir.
- [ ] **`POST /api/auth/logout`**
  - Gönderilen `refreshToken`'ı iptal eder.
  - **Kritik İş Kuralı:** Eğer istek atıldığında `accessToken`'ın süresi dolmuşsa, sunucu `401 Unauthorized` hatası vermemeli, çıkış işlemini başarıyla tamamlayıp HTTP 200/204 dönmelidir. Aksi takdirde frontend sonsuz hata döngüsüne girmektedir.
- [ ] **`GET /api/auth/me`**
  - Giriş yapmış kullanıcının profil bilgilerini döner. `employeeId` değeri `HR` ve `Admin` için `null`, `Employee` ve `Manager` için ilişkili çalışan ID'si olmalıdır.

### 5.2 Employees (Çalışanlar) Modülü

- [ ] **`GET /api/employees`**
  - Sayfalanmış çalışan listesini döner.
  - **Eksik Alan Düzeltmesi:** Liste verisinin içerisindeki her çalışan nesnesi `performanceScore` alanını da barındırmalıdır. Şu an dönmediği için arayüzde tüm puanlar varsayılan olarak boş veya `-` görünmektedir.
  - **Yönetici Filtresi:** İstek atan kullanıcı `Manager` ise, liste otomatik olarak yöneticinin ekibiyle filtrelenmiş gelmelidir.
- [ ] **`GET /api/employees/{id}`**
  - Belirtilen çalışanın tüm kişisel ve departman detaylarını getirir.
- [ ] **`POST /api/employees`**
  - Yeni çalışan ekler (Yalnızca `Admin` yetkisi). Formdaki 20+ ML özelliğini kabul etmeli ve doğrulamalıdır.
- [ ] **`GET /api/employees/{id}/assessments`**
  - Çalışana ait geçmiş ve aktif değerlendirme süreçlerini listeler.
- [ ] **`GET /api/employees/{id}/action-plans`**
  - Çalışana ait gelişim planlarını listeler.
- [ ] **`GET /api/employees/{id}/features`**
  - Çalışanın ML modeline gönderilecek özellik vektörünü (öz değerlendirme ortalamaları, departman puanları, yaş vb.) hesaplayıp döner.

### 5.3 Assessments (Değerlendirmeler) Modülü

- [ ] **`POST /api/assessments`**
  - Çalışan için yeni değerlendirme süreci başlatır.
  - **Kritik İş Kuralı 1:** Aynı çalışanın devam eden ve statüsü `Completed` olmamış başka bir değerlendirmesi varsa veya aktif gelişim planı tamamlanmamışsa hata (400 Bad Request) dönmeli ve yeni süreç açtırmamalıdır.
  - **Kritik İş Kuralı 2:** Süreç açıldığında `AssessmentAssignments` tablosuna `Self` (çalışanın kendisi) ve yöneticisi tanımlıysa `Manager` atama kayıtları otomatik `isCompleted = false` olarak eklenmelidir.
- [ ] **`GET /api/assessments/{id}`**
  - Değerlendirmenin detaylarını ve durumunu (`InProgress`, `Completed`) getirir.
- [ ] **`PUT /api/assessments/{id}/complete`**
  - Değerlendirmeyi zorla kapatır. Ataması eksik olan kişileri bypass eder, mevcut skorların ortalamasını alarak `overallScore` alanını günceller ve durumu `Completed` yapar.
- [ ] **`GET /api/assessments/{id}/scores`**
  - Değerlendirme kapsamında girilmiş tüm yetkinlik puanlarını listeler.
- [ ] **`POST /api/assessments/{id}/scores`**
  - Tekil puan ekler/günceller.
  - **Yetki Kuralı:** HR ve Admin için atama kısıtlamasına takılmadan her yetkinliğe ve her değerlendirici rolü adına puan yazabilmelidir.
- [ ] **`POST /api/assessments/{id}/scores/bulk`**
  - Bir değerlendiricinin tüm puanlarını tek seferde toplu kaydeder.
  - **Kritik İş Kuralı:** 13 yetkinliğin tamamı gönderildiğinde, ilgili değerlendirici atamasının (`AssessmentAssignment`) durumu otomatik olarak `isCompleted = true` yapılmalıdır. Tüm atamalar tamamlandığında değerlendirme süreci de otomatik `Completed` olmalıdır.
- [ ] **`POST /api/assessments/{id}/assignments`**
  - Sürece yeni bir değerlendirici (Peer veya Subordinate) atar.
- [ ] **`GET /api/assessments/{id}/assignments`**
  - Atanmış tüm değerlendiricileri, isimlerini ve anket tamamlama durumlarını listeler.

### 5.4 Action Plans (Aksiyon Planları) Modülü

- [ ] **`POST /api/action-plans/generate`**
  - ML servisini tetikleyerek zayıf yetkinliklere göre aksiyon planı taslağı oluşturur (`Draft`).
- [ ] **`GET /api/action-plans/{id}`**
  - Aksiyon planını ve maddelerini getirir.
- [ ] **`PUT /api/action-plans/{id}/items/{itemId}`**
  - Plan maddesini (başlık, açıklama, öncelik, bitiş tarihi) günceller.
- [ ] **`POST /api/action-plans/{id}/items`**
  - Plana manuel madde ekler.
- [ ] **`DELETE /api/action-plans/{id}/items/{itemId}`**
  - Maddeyi plandan siler.
- [ ] **`POST /api/action-plans/{id}/approve`**
  - Planı onaylar (`Draft` -> `Approved`).
- [ ] **`POST /api/action-plans/{id}/send`**
  - Planı çalışana gönderir (`Approved` -> `Sent`).
  - **Kritik İş Kuralı:** Gönderim esnasında plandaki her bir madde için `EmployeeTasks` tablosuna `Pending` durumunda birer görev eklemeli ve çalışana atamalıdır.
- [ ] **`POST /api/action-plans/{id}/cancel`**
  - Planı iptal eder (`Cancelled`).
- [ ] **`GET /api/action-plans/{id}/export-pdf`**
  - Aksiyon planını PDF formatında dynamic stream olarak döner (Türkçe fontlu, öncelik sıralı).
  - **Yetki Genişletmesi:** Normalde `HrOrManager` olan bu endpoint'e, ilgili gelişim planının sahibi olan çalışanın kendisi (`employeeId` eşleşmesi ile) istek attığında da PDF çıktısı başarıyla dönmeli, yetki hatası (403) verilmemelidir.

### 5.5 Tasks (Görevler & Anketler) Modülü

- [ ] **`GET /api/tasks/my`**
  - Giriş yapan çalışanın aksiyon planından gelen gelişim görevlerini listeler.
  - **Eksik Alan Düzeltmesi:** Dönüş yapan `EmployeeTaskDto` listesindeki her görev nesnesi, çalışanın kendi gelişim planını indirebilmesi için **`actionPlanId`** bilgisini, görevin detaylı kaynağına erişebilmesi için de **`resource`** ve **`deliveryType`** alanlarını barındırmalıdır.
- [ ] **`GET /api/tasks/my-surveys`**
  - Giriş yapan çalışanın doldurması gereken aktif 360° anket atamalarını listeler (`MySurveyDto[]`).
- [ ] **`PUT /api/tasks/{id}/status`**
  - Çalışanın Kanban panosundaki görevinin durumunu günceller (`Pending` -> `InProgress` -> `Completed`).
  - **Kritik İş Kuralı:** Aksiyon planına bağlı tüm görevler `Completed` statüsüne geldiğinde, sistem veritabanındaki bağlı gelişim planının (`ActionPlan`) durumunu da otomatik olarak `Completed` yapmalıdır.
