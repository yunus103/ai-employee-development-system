# Frontend Entegrasyon Rehberi — Bitirme Projesi Backend

> **Hedef kitle:** Frontend geliştirici
> **Backend:** ASP.NET Core 9/10 Web API · PostgreSQL · JWT Bearer Auth
> **Amaç:** Bu doküman hem son oturumda yapılan değişiklikleri, hem de tüm sistemin
> (veritabanı, ilişkiler, yaşam döngüsü, endpoint'ler) frontend tarafından nasıl
> kullanılacağını uçtan uca anlatır.

---

## BÖLÜM 1 — Bu Oturumda Yapılan 11 Değişiklik + Güvenlik Düzeltmesi

Aşağıdaki değişiklikler frontend entegrasyonunu doğrudan etkiler. Her madde "ne işe yarar"
ve "frontend'i nasıl etkiler" açısından açıklanmıştır.

### 1. Logout artık süresi dolmuş token ile çalışıyor
- **Önce:** `POST /api/auth/logout` `[Authorize]` idi; access token süresi dolmuşsa **401**
  dönüyor, frontend sonsuz hata/yenileme döngüsüne giriyordu.
- **Şimdi:** Endpoint `[AllowAnonymous]`. Oturum, body'deki `refreshToken`'dan çözümleniyor
  ve işlem **idempotent** — bilinmeyen/iptal edilmiş/süresi dolmuş token bile **200** döner.
- **Frontend etkisi:** Çıkışta access token'ın geçerli olup olmadığını kontrol etmenize gerek
  yok. Her durumda `refreshToken`'ı body'de gönderin, 200 bekleyin, local state'i temizleyin.

### 2. `GET /api/tasks/my` yanıtına eksik alanlar eklendi
- **Eklenen alanlar:** `actionPlanId`, `resource`, `deliveryType`.
- **Frontend etkisi:** Çalışanın Kanban kartından artık (a) ait olduğu gelişim planının
  PDF'ini indirebilir (`actionPlanId` → `/api/action-plans/{actionPlanId}/export-pdf`),
  (b) kaynak linkini (`resource`) ve teslim türünü (`deliveryType`) gösterebilirsiniz.

### 3. HR/Admin "Temsili Veri Girişi" (Proxy / God Mode) çalışıyor
- **Önce:** HR/Admin bir çalışan adına puan girmeye çalışınca *"Bu değerlendirme için atama
  bulunamadı"* hatası alıyordu.
- **Şimdi:** HR ve Admin, atama kısıtına takılmadan **herhangi bir değerlendirici rolü adına**
  puan girebilir (`POST /scores` ve `POST /scores/bulk`).
- **Frontend etkisi:** HR/Admin panelindeki "rol seç + puan gir" dropdown akışı artık sorunsuz.
  Bulk proxy'de atama yoksa `evaluatorType` alanını göndermeniz yeterli (aşağıda detay).

### 4. `GET /api/employees` yanıtına `performanceScore` eklendi
- **Frontend etkisi:** Çalışan listesi grid'inde performans puanı sütunu artık dolu gelir
  (önceden `-` görünüyordu).

### 5. Değerlendirme açılınca **Manager** ataması da otomatik oluşuyor
- **Önce:** Sadece `Self` (öz değerlendirme) ataması otomatik ekleniyordu.
- **Şimdi:** Çalışanın `managerId`'si tanımlıysa **Manager** ataması da otomatik eklenir.
- **Frontend etkisi:** Yöneticinin 360° anketi, HR'ın manuel atama yapmasına gerek kalmadan
  ilgili yöneticinin `GET /api/tasks/my-surveys` listesinde görünür.

### 6. AI aksiyon planında **dinamik öncelik**
- **Önce:** Tüm aksiyon maddeleri sabit `Medium` önceliğiyle geliyordu.
- **Şimdi:** ML sıralamasına göre üst dilim **High**, orta **Medium**, alt **Low**.
- **Frontend etkisi:** Plan/Kanban ekranında öncelik rozetleri artık anlamlı renk/dağılım
  gösterir; öncelik bazlı sıralama ve filtreleme gerçekçi olur.

### 7. Çalışan kendi gelişim planının PDF'ini indirebiliyor
- **Önce:** `GET /api/action-plans/{id}/export-pdf` yalnızca HR/Manager içindi (çalışan 403).
- **Şimdi:** Endpoint `[Authenticated]`; çalışan **kendi** planının PDF'ini indirebilir
  (sahiplik `employeeId` ile doğrulanır). HR/Admin hepsini, Manager kendi ekibini indirir.
- **Frontend etkisi:** Çalışan ekranına "Planı PDF indir" butonu eklenebilir.

### 8. Manuel/zorla kapanışta `overallScore` hesaplanıyor
- **Önce:** `PUT /api/assessments/{id}/complete` ile zorla kapatınca `overallScore` `null`
  kalıyordu.
- **Şimdi:** Mevcut puanların ortalaması alınır ve `overallScore` set edilir.
- **Frontend etkisi:** Zorla kapatılan değerlendirmelerde de genel skor gösterilebilir.

### 9. Zorla kapatma (bypass) sadece HR/Admin'e açık
- **Önce:** `PUT /api/assessments/{id}/complete` Manager'a da açıktı.
- **Şimdi:** Yeni `HrOrAdmin` yetkisi; Manager bu işlemi yapamaz (rol matrisine uygun, **403**).
- **Frontend etkisi:** "360° Sürecini Tamamla" butonunu yalnızca HR/Admin rollerine gösterin.

### 10. Görev durumu `Assigned` → `Pending` olarak yeniden adlandırıldı
- **Önce:** İlk görev durumu `Assigned` idi; dökümante edilen yaşam döngüsü `Pending`'di (uyumsuz).
- **Şimdi:** Yaşam döngüsü tutarlı: **`Pending` → `InProgress` → `Completed`** (ayrıca `Cancelled`).
  Geriye dönük uyum korunmuştur (eski `"Assigned"` kayıtları `Pending` olarak okunur).
- **Frontend etkisi:** Kanban'ın ilk kolonu için durum değeri olarak **`"Pending"`** kullanın.
  Durum güncellerken `PUT /api/tasks/{id}/status` body'sinde `"Pending"` gönderin/bekleyin.

### 11. PDF başlığına Çalışan Kodu ve Yönetici eklendi
- **Şimdi:** Aksiyon planı PDF header'ı artık: Çalışan, **Çalışan Kodu**, Departman, Pozisyon,
  **Yönetici**, Değerlendirme Dönemi, tarihler ve durum içerir. (Bonus: Departman/Pozisyon
  önceden boş gelebiliyordu, artık dolu.)
- **Frontend etkisi:** Görsel bir değişiklik yok; PDF içeriği zenginleşti.

### Güvenlik — Bulk skor sahiplik kontrolü
- `POST /api/assessments/{id}/scores/bulk` `[Authenticated]` olduğundan, proxy olmayan bir
  kullanıcı teorik olarak başkasının atamasına puan gönderebiliyordu.
- **Şimdi:** Proxy olmayan (Employee/Manager) çağıran **yalnızca kendi** `evaluatorEmployeeId`'si
  için gönderebilir; aksi halde **401**. HR/Admin proxy muaftır.
- **Frontend etkisi:** Çalışan/Manager bulk gönderiminde `evaluatorEmployeeId` mutlaka oturum
  sahibinin kendi `employeeId`'si olmalı.

---

## BÖLÜM 2 — Sistem Mimarisi ve Genel Yapı

### 2.1 Teknoloji
| Katman | Teknoloji |
|--------|-----------|
| API | ASP.NET Core Web API (REST/JSON) |
| Veritabanı | PostgreSQL (EF Core + Npgsql) |
| Kimlik doğrulama | JWT Bearer + Refresh Token (rotation) |
| ML servisi | FastAPI (aksiyon önerisi), circuit breaker ile çağrılır |
| PDF | QuestPDF (anlık üretim, diskte saklanmaz) |

### 2.2 Katmanlı yapı (Clean Architecture)
```
BitirmeBackend.Api            → Controller, middleware, validator, Program.cs (DI)
BitirmeBackend.Application    → Servisler (iş mantığı), arayüzler
BitirmeBackend.Domain         → Entity'ler, enum'lar
BitirmeBackend.Contracts      → DTO / Request / Response sınıfları (API sözleşmesi)
BitirmeBackend.Infrastructure → EF Core, repository'ler, ML client, PDF, token servisleri
```
Önemli ilke: **DTO ≠ Entity.** Frontend yalnızca `Contracts` katmanındaki DTO şekillerini görür.

### 2.3 Temel URL ve CORS
- Geliştirme temel URL: `http://localhost:<port>` (örn. `http://localhost:5000`).
- Tüm yollar `api/` ile başlar.
- CORS varsayılan izinli origin: `http://localhost:3000` (`appsettings.json → AllowedOrigins`).
  Frontend farklı portta çalışıyorsa bu ayar güncellenmelidir.

---

## BÖLÜM 3 — Kimlik Doğrulama, Roller ve Yetkilendirme

### 3.1 JWT akışı
1. `POST /api/auth/login` → `accessToken` (kısa ömürlü, ~60 dk) + `refreshToken` (uzun ömürlü, ~7 gün).
2. Her korumalı istekte header: `Authorization: Bearer <accessToken>`.
3. Access token süresi dolunca `POST /api/auth/refresh` ile yeni çift alınır (**token rotation**:
   eski refresh token iptal edilir, yenisi verilir — **eski token'ı saklamayın**).
4. Çıkışta `POST /api/auth/logout` (access token geçersiz olsa bile çalışır).

### 3.2 Access token içindeki claim'ler
| Claim | Açıklama |
|-------|----------|
| `userId` | Kullanıcı kimliği |
| `email` | E-posta |
| `role` | `Admin` / `HR` / `Manager` / `Employee` |
| `employeeId` | Sadece `Employee` ve `Manager` için doludur; `HR`/`Admin` için **yoktur/null** |

### 3.3 Roller ve yetki matrisi
| Yetki Politikası | Roller | Kullanım |
|------------------|--------|----------|
| `AdminOnly` | Admin | Çalışan oluşturma |
| `HrOrAdmin` | Admin, HR | Değerlendirmeyi zorla tamamlama (bypass) |
| `HrOrManager` | Admin, HR, Manager | Çalışan/değerlendirme/plan yönetimi |
| `EmployeeOnly` | Employee | Kendi Kanban görev durumunu güncelleme |
| `Authenticated` | Tüm girişli kullanıcılar | Kendi verisine erişim (sahiplik kontrolüyle) |

| Rol | Çalışan Listesi | 360° Başlatma | Zorla Kapatma | Puan Girişi | Plan Yönetimi | Kendi Görevleri |
|-----|-----------------|---------------|---------------|-------------|---------------|-----------------|
| **Admin** | Tüm şirket | ❌ | ✅ (bypass) | ✅ Temsili (tüm roller) | ❌ | ❌ |
| **HR** | Tüm şirket | ✅ | ✅ (bypass) | ✅ Temsili (tüm roller) | ✅ Tüm şirket | ❌ |
| **Manager** | Sadece kendi ekibi | Kendi ekibi için | ❌ | ✅ Sadece kendi anketi | ✅ Sadece kendi ekibi | ❌ |
| **Employee** | ❌ | ❌ | ❌ | ✅ Sadece kendi anketi | ❌ | ✅ |

> **Önemli:** Yetkisiz erişimlerde sunucu **403 Forbidden** veya **401 Unauthorized** döner.
> Manager kapsam dışı bir çalışana erişmeye çalışırsa **erişim reddi** alır (oturumu kapatmayın,
> sadece ilgili işlemi engelleyin).

---

## BÖLÜM 4 — Ortak Yanıt Zarfları (Response Envelopes)

### 4.1 Standart başarı zarfı (`ApiResponse<T>`)
```json
{
  "success": true,
  "message": null,
  "data": { /* asıl içerik */ }
}
```

### 4.2 Sayfalı yanıt (`PagedResponse<T>`)
Liste endpoint'lerinde (`/employees`, `/tasks/my`, `/{id}/assessments`) kullanılır:
```json
{
  "success": true,
  "data": [ /* öğeler */ ],
  "totalCount": 42,
  "pageNumber": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

### 4.3 Hata zarfı
```json
{
  "success": false,
  "message": "Hata açıklaması",
  "errors": [ "..." ],
  "correlationId": "..."
}
```
Her yanıtta `X-Correlation-Id` header'ı bulunur; hata raporlamada bu değeri loglayın.

### 4.4 HTTP durum kodları
| Kod | Anlam |
|-----|-------|
| 200 / 201 / 204 | Başarılı |
| 400 | Geçersiz istek / iş kuralı ihlali (ör. eksik feature, geçersiz durum geçişi) |
| 401 | Kimlik doğrulama yok/geçersiz |
| 403 | Yetki yok (rol/kapsam) |
| 404 | Kayıt bulunamadı |
| 409 | Çakışma (ör. aynı assessment için zaten aktif plan) |
| 503 | ML servisi ulaşılamıyor (circuit breaker açık) |

---

## BÖLÜM 5 — Veritabanı Yapısı, Tablolar ve İlişkiler

### 5.1 İlişki şeması (özet)
```
Role 1───* User
User *───1 Employee (opsiyonel; HR/Admin'in employee'si yoktur)
Department 1───* Employee
JobRole    1───* Employee
Employee 1───* Employee (Manager ↔ DirectReports, self-referencing)

Employee 1───* Assessment
AssessmentCycle 1───* Assessment
Assessment 1───* AssessmentScore        (her skor bir Competency + bir Evaluator)
Assessment 1───* AssessmentAssignment   (her değerlendirici için bir anket)
Competency 1───* AssessmentScore

Assessment 1───* AiPredictionRun 1───* AiPredictedAction
ModelVersion 1───* AiPredictionRun

Assessment 1───* ActionPlan 1───* ActionPlanItem
ActionCatalog 1───* ActionPlanItem      (ActionId string FK; opsiyonel)
AiPredictedAction 1───* ActionPlanItem  (opsiyonel)
ActionPlanItem 1───* EmployeeTask
Employee 1───* EmployeeTask
EmployeeTask 1───* TaskComment
```

> Tüm ana tablolar `BaseEntity`'den gelir: `Id`, `CreatedAt`, `UpdatedAt`, `IsDeleted`.
> **Soft delete:** `IsDeleted = true` kayıtlar sorgularda varsayılan olarak hariç tutulur.

### 5.2 Tablolar ve önemli alanlar

**Role** — `Id`, `Name` (`Admin`/`HR`/`Manager`/`Employee`)

**User** — `Id`, `FullName`, `Email`, `PasswordHash` (BCrypt), `RoleId`, `EmployeeId?`, `IsActive`

**RefreshToken** — `TokenHash` (SHA256, ham token saklanmaz), `ExpiresAt`, `IsRevoked`,
`RevokedAt`, `ReplacedByTokenHash` (rotation izi)

**Department** — `Id`, `Name`
**JobRole** — `Id`, `Name`

**Employee** — kişisel + ML özellikleri:
`EmployeeCode`, `FullName`, `Email`, `Age`, `Gender`, `DepartmentId`, `JobRoleId`, `ManagerId?`,
`Education`, `EducationField`, `BusinessTravel`, `MaritalStatus`, `DistanceFromHome`,
`EnvironmentSatisfaction`, `JobSatisfaction`, `WorkLifeBalance`, `TotalWorkingYears`,
`YearsAtCompany`, `YearsInCurrentRole`, `YearsWithCurrManager`, `PerformanceScore`, `Attrition`,
`IsActive`

**Competency** — `Code` (ör. `Core_Communication`), `Name`, `Category`. Toplam **13 yetkinlik**:
`Core_Communication, Core_Teamwork, Core_ProblemSolving, Core_Adaptability, Core_Initiative,
Core_Accountability, Core_LearningAgility, Core_TimeManagement, Dept_Comp1, Dept_Comp2,
Dept_Comp3, Role_Comp1, Role_Comp2`

**AssessmentCycle** — `Id`, `Name` (değerlendirme dönemi)

**Assessment** — `EmployeeId`, `CycleId`, `OverallScore?`, `Status`, `CreatedByUserId`
- `Status` enum: `Draft(1)`, `Completed(2)`, `Analyzed(3)`, `ActionPlanGenerated(4)`,
  `Approved(5)`, `SentToEmployee(6)`. (Pratikte aktif kullanılan: **Draft** ve **Completed**.)

**AssessmentScore** — benzersiz anahtar **(AssessmentId, CompetencyId, EvaluatorEmployeeId)**
- `EvaluatorType` enum: `Self(1)`, `Manager(2)`, `Peer(3)`, `Subordinate(4)`
- `Score`: 0–5 arası double

**AssessmentAssignment** — bir değerlendiricinin anketi; benzersiz **(AssessmentId, EvaluatorEmployeeId)**
- `EvaluatorType` (string), `IsCompleted`, `CompletedAt?`
- Self ve Manager her assessment için benzersiz; Peer/Subordinate birden fazla olabilir.

**ModelVersion** — ML model sürümü
**AiPredictionRun** — `AssessmentId`, `ModelVersionId`, `Status` (`Pending/Success/Failed`), `ErrorMessage?`
**AiPredictedAction** — `ActionCode`, `Probability`, `RankOrder`, `IsSelected`

**ActionCatalog** — `ActionId` (string PK, ör. `DEPT_COMP1_03`), `TargetCompetency`, `ActionType`,
`Difficulty`, `ContentData` (JSONB), `IsActive`

**ActionPlan** — `AssessmentId`, `EmployeeId`, `CreatedByUserId`, `Status`, `ApprovedAt?`, `SentAt?`
- `Status` enum: `Draft(1)`, `Edited(2)`, `Approved(3)`, `Sent(4)`, `Completed(5)`, `Cancelled(6)`
- Bir assessment için aynı anda yalnızca **bir aktif plan** olabilir (unique filtered index).

**ActionPlanItem** — `Title`, `Description`, `Resource?`, `DeliveryType?`, `Priority`, `DueDate?`,
`Source`, `OrderNo`, `ActionCatalogId?`, `AiPredictedActionId?`
- `Priority` enum: `Low(1)`, `Medium(2)`, `High(3)`
- `Source` enum: `AI(1)`, `Manual(2)`, `EditedAI(3)`
- Ayrı bir `Status` alanı **yoktur** — durum bağlı `EmployeeTask` üzerinden izlenir.

**EmployeeTask** — `ActionPlanItemId`, `EmployeeId`, `AssignedByUserId`, `Status`, `AssignedAt`,
`DueDate?`, `CompletedAt?`
- `Status` enum: **`Pending(1)`**, `InProgress(2)`, `Completed(3)`, `Cancelled(4)`
- Plan item başına en fazla bir aktif görev (send idempotency).

**TaskComment** — `TaskId`, `UserId`, `CommentText`, `CreatedAt`

---

## BÖLÜM 6 — Uçtan Uca Yaşam Döngüsü (Lifecycle)

### A) 360° Değerlendirme Döngüsü
1. HR/Manager süreç başlatır → `POST /api/assessments` (Status = `Draft`).
2. Sistem otomatik olarak **Self** ve (manager varsa) **Manager** atamalarını oluşturur.
3. HR/Admin ek değerlendirici (`Peer`/`Subordinate`) atayabilir → `POST /assessments/{id}/assignments`.
4. Değerlendiriciler bekleyen anketlerini görür → `GET /api/tasks/my-surveys`.
5. Puanları toplu gönderirler → `POST /assessments/{id}/scores/bulk`. 13 yetkinlik tamamlanınca
   atama otomatik `isCompleted = true` olur.
6. **Otomatik kapanış:** Tüm atamalar tamamlanınca assessment otomatik `Completed` olur ve
   `overallScore` hesaplanır.
7. **Zorla kapanış (HR/Admin):** `PUT /assessments/{id}/complete` — eksik atamaları bypass eder,
   mevcut skorların ortalamasını alır, `Completed` yapar.

### B) Gelişim Planı ve Kanban Döngüsü
1. Assessment `Completed` olduktan sonra → `POST /api/action-plans/generate` → ML çağrılır,
   `Draft` plan oluşur (dinamik öncelikli AI maddeleri).
2. HR/Manager düzenler (madde ekle/sil/güncelle) → plan `Edited` olur.
3. `POST /action-plans/{id}/approve` → `Approved`.
4. `POST /action-plans/{id}/send` → `Sent`; her madde için çalışana `EmployeeTask` (`Pending`) oluşur.
5. Çalışan görevlerini günceller → `PUT /api/tasks/{id}/status` (`Pending → InProgress → Completed`).
6. **Otomatik tamamlanma:** Planın tüm görevleri `Completed` olunca plan otomatik `Completed` olur.

---

## BÖLÜM 7 — Endpoint Referansı

> Notasyon: 🔓 = anonim, 🔒 = giriş gerektirir. Yetki politikası parantez içinde.
> Tüm korumalı isteklerde `Authorization: Bearer <accessToken>` header'ı zorunludur.

### 7.1 Auth — `api/auth`

#### 🔓 POST /api/auth/login
Giriş yapar, token çifti döner.
```json
// İstek
{ "email": "buse.demir@demo.com", "password": "Demo1234!" }
// Yanıt (data)
{
  "accessToken": "eyJ...", "refreshToken": "base64...",
  "accessTokenExpiresAt": "2026-06-14T12:00:00Z",
  "userId": 5, "fullName": "Buse Demir", "email": "buse.demir@demo.com",
  "role": "Employee", "employeeId": 2
}
```
Demo şifreleri: `Demo1234!` (çalışanlar), `Hr1234!`, `Admin1234!`.

#### 🔓 POST /api/auth/refresh
```json
// İstek
{ "refreshToken": "base64..." }
// Yanıt (data): yeni accessToken + yeni refreshToken + accessTokenExpiresAt
```
> Token rotation: eski refresh token geçersiz olur. Yeni `refreshToken`'ı saklayın.

#### 🔓 POST /api/auth/logout
```json
{ "refreshToken": "base64..." }
```
Her zaman 200 döner (idempotent). Çıkışta local token'ları temizleyin.

#### 🔒 GET /api/auth/me  (Authenticated)
Giriş yapan kullanıcının profili:
```json
{ "userId": 5, "fullName": "Buse Demir", "email": "...", "role": "Employee",
  "employeeId": 2, "isActive": true }
```
> `HR`/`Admin` için `employeeId = null`.

---

### 7.2 Employees — `api/employees`

#### 🔒 GET /api/employees?pageNumber=1&pageSize=20  (HrOrManager)
Sayfalı çalışan listesi (`PagedResponse<EmployeeListItemDto>`). Manager ise otomatik kendi
ekibiyle filtrelenir. Her öğe:
```json
{ "id": 1, "employeeCode": "EMP001", "fullName": "Ahmet Yılmaz", "email": "...",
  "department": "Bilgi Teknolojileri", "jobRole": "Yazılım Mühendisi",
  "managerId": 3, "performanceScore": 3.5, "isActive": true }
```

#### 🔒 GET /api/employees/{id}  (Authenticated)
Çalışan detayı. HR/Admin tüm alanları, Manager kendi ekibini görür. `Employee` rolü ise yalnızca
aktif bir atama ilişkisi varsa sınırlı bilgi (`EmployeeBasicInfoDto`: id, fullName, department,
jobRole) görür.

#### 🔒 POST /api/employees  (AdminOnly)
Yeni çalışan ekler. Body: `CreateEmployeeRequest` (20+ ML özelliği — employeeCode, fullName,
email, age, gender, departmentId, jobRoleId, managerId?, education, educationField,
businessTravel, maritalStatus, distanceFromHome, environmentSatisfaction, jobSatisfaction,
workLifeBalance, totalWorkingYears, yearsAtCompany, yearsInCurrentRole, yearsWithCurrManager,
performanceScore, attrition).

#### 🔒 PUT /api/employees/{id}  (HrOrManager)
Çalışan günceller. Body: `UpdateEmployeeRequest` (Create alanları + `isActive`).

#### 🔒 GET /api/employees/{id}/assessments?pageNumber=1&pageSize=10  (HrOrManager)
Çalışanın değerlendirme geçmişi (sayfalı).

#### 🔒 GET /api/employees/{id}/action-plans  (Authenticated)
Çalışanın gelişim planları. Employee yalnızca kendi `id`'sine erişebilir.

#### 🔒 GET /api/employees/{id}/features?assessmentId={aid}  (HrOrManager)
ML özellik vektörünü hesaplar (360° konsolidasyon dahil). Eksik feature varsa **400**:
```json
{ "success": false, "message": "Eksik özellikler: ...",
  "missingFeatures": ["Dept_Comp2", "Gender"] }
```

---

### 7.3 Assessments — `api/assessments`

#### 🔒 POST /api/assessments  (HrOrManager)
360° süreci başlatır. Self + (varsa) Manager ataması otomatik oluşur.
```json
// İstek
{ "employeeId": 2, "cycleId": 1 }
```
> **400** döner: çalışanın devam eden değerlendirmesi veya tamamlanmamış gelişim planı varsa.

#### 🔒 GET /api/assessments/{id}  (HrOrManager)
Değerlendirme detayı:
```json
{ "id": 1, "employeeId": 2, "employeeName": "Buse Demir", "cycleId": 1,
  "cycleName": "2026 Q1", "overallScore": 3.4, "status": "Completed",
  "createdByUserId": 1, "createdByUserName": "HR User", "createdAt": "...", "updatedAt": "..." }
```

#### 🔒 PUT /api/assessments/{id}/complete  (HrOrAdmin)
Zorla kapatır (bypass), `overallScore` hesaplanır, `Completed` yapılır.
> **Sadece HR/Admin.** Manager çağırırsa **403**.

#### 🔒 GET /api/assessments/{id}/scores  (Authenticated)
Skorları listeler. `Employee` rolü yalnızca kendi evaluator skorlarını görür (atama gerekli).
Her öğe: `{ id, assessmentId, competencyId, competencyCode, competencyName,
evaluatorEmployeeId, evaluatorType, score }`.

#### 🔒 POST /api/assessments/{id}/scores  (HrOrManager)
Tekil puan ekler/günceller (upsert).
```json
{ "competencyId": 1, "evaluatorEmployeeId": 2, "evaluatorType": "Self", "score": 4.0 }
```
> HR/Admin: atama kısıtı olmadan **herhangi bir rol adına** girebilir (proxy/God Mode).
> Manager: yalnızca kendi atamasına. Skor 0–5 dışındaysa **400**.

#### 🔒 PUT /api/assessments/{id}/scores/{scoreId}  (HrOrManager)
Skoru günceller (gövde `POST /scores` ile aynı; güncelleme yine
assessmentId+competencyId+evaluatorEmployeeId anahtarına göre yapılır).

#### 🔒 POST /api/assessments/{id}/scores/bulk  (Authenticated)
Bir değerlendiricinin **tüm** puanlarını tek istekte gönderir.
```json
{
  "evaluatorEmployeeId": 2,
  "evaluatorType": "Self",      // opsiyonel; sadece HR/Admin proxy + atama yoksa zorunlu
  "scores": [
    { "competencyId": 1, "score": 4.0 },
    { "competencyId": 2, "score": 3.5 }
    /* ... 13 yetkinlik ... */
  ]
}
```
- 13 yetkinlik tamamlanınca atama otomatik `isCompleted = true`, tüm atamalar bitince assessment
  otomatik `Completed` olur.
- **Güvenlik:** Proxy olmayan kullanıcı (Employee/Manager) için `evaluatorEmployeeId` mutlaka
  kendi `employeeId`'si olmalı; aksi halde **401**.

#### 🔒 POST /api/assessments/{id}/assignments  (HrOrManager)
Yeni değerlendirici atar.
```json
{ "evaluatorEmployeeId": 7, "evaluatorType": "Peer" }
```
> Self/Manager benzersizdir; tekrar atanırsa **400**.

#### 🔒 GET /api/assessments/{id}/assignments  (HrOrManager)
Atanmış değerlendiricileri listeler: `{ id, assessmentId, evaluatorEmployeeId,
evaluatorEmployeeName, evaluatorType, isCompleted, completedAt }`.

---

### 7.4 Action Plans — `api/action-plans`

#### 🔒 POST /api/action-plans/generate  (HrOrManager)
ML servisini tetikler, `Draft` plan üretir (dinamik öncelikli AI maddeleri).
```json
{ "assessmentId": 1, "topK": 13 }
```
> Önkoşullar: assessment `Completed` olmalı; aktif başka plan olmamalı.
> ML kapalıysa **503** (*"Gelişim planı öneri servisine şu anda ulaşılamıyor..."* mesajı gösterin).

#### 🔒 GET /api/action-plans/{id}  (HrOrManager)
Plan + maddeleri. Maddeler öncelik (High→Low) ve tamamlanma durumuna göre sıralı döner:
```json
{
  "id": 10, "assessmentId": 1, "employeeId": 2, "employeeName": "Buse Demir",
  "createdByUserId": 1, "createdByUserName": "HR User", "status": "Draft",
  "approvedAt": null, "sentAt": null, "createdAt": "...", "updatedAt": "...",
  "items": [
    { "id": 100, "actionPlanId": 10, "actionCatalogId": "DEPT_COMP1_03",
      "aiPredictedActionId": 55, "title": "...", "description": "...",
      "resource": "https://...", "deliveryType": "Online Kurs",
      "priority": "High", "dueDate": null, "source": "AI", "orderNo": 1,
      "taskStatus": null }
  ]
}
```

#### 🔒 PUT /api/action-plans/{id}/items/{itemId}  (HrOrManager)
Madde günceller (`title`, `description`, `priority`, `dueDate`, `orderNo`). AI maddesi
düzenlenince `source` → `EditedAI`. Yalnızca `Draft`/`Edited` planda.

#### 🔒 POST /api/action-plans/{id}/items  (HrOrManager)
Manuel madde ekler (`source = Manual`); plan `Draft` ise `Edited` olur.
```json
{ "title": "...", "description": "...", "priority": "Medium", "dueDate": "2026-07-01",
  "actionCatalogId": null }
```

#### 🔒 DELETE /api/action-plans/{id}/items/{itemId}  (HrOrManager)
Maddeyi soft-delete eder. **204** döner.

#### 🔒 POST /api/action-plans/{id}/approve  (HrOrManager)
`Draft`/`Edited` → `Approved`. Boş plan onaylanamaz (**400**). İdempotent.

#### 🔒 POST /api/action-plans/{id}/send  (HrOrManager)
`Approved` → `Sent`. Her madde için çalışana `EmployeeTask` (`Pending`) oluşturur. İdempotent.

#### 🔒 POST /api/action-plans/{id}/cancel  (HrOrManager)
`Draft`/`Edited` planı `Cancelled` yapar. `Approved`/`Sent`/`Completed` iptal edilemez (**400**).

#### 🔒 GET /api/action-plans/{id}/export-pdf  (Authenticated)
Planın PDF'ini döner (`application/pdf`, `Content-Disposition: attachment;
filename=aksiyon-plani-{id}.pdf`). Türkçe font, öncelik sıralı, başlıkta çalışan/kod/departman/
pozisyon/yönetici bilgisi. **Çalışan kendi planını indirebilir**; HR/Admin hepsini, Manager ekibini.
> Frontend: yanıtı blob olarak alın ve indirme bağlantısına çevirin.

---

### 7.5 Tasks & Surveys — `api/tasks`

#### 🔒 GET /api/tasks/my-surveys  (Authenticated)
Çalışanın doldurması gereken aktif 360° anketleri (`MySurveyDto[]`):
```json
[{ "assignmentId": 9, "assessmentId": 1, "employeeId": 2, "employeeName": "Buse Demir",
   "cycleId": 1, "cycleName": "2026 Q1", "evaluatorType": "Self", "competencyCount": 13 }]
```
> Puanları `POST /assessments/{assessmentId}/scores/bulk` ile gönderin.

#### 🔒 GET /api/tasks/my?pageNumber=1&pageSize=20  (Authenticated)
Çalışana atanan gelişim görevleri (sayfalı `EmployeeTaskDto`):
```json
{ "id": 200, "actionPlanItemId": 100, "actionPlanId": 10,
  "title": "...", "description": "...", "resource": "https://...",
  "deliveryType": "Online Kurs", "priority": "High",
  "employeeId": 2, "employeeName": "Buse Demir",
  "assignedByUserId": 1, "assignedByUserName": "HR User",
  "status": "Pending", "assignedAt": "...", "dueDate": null, "completedAt": null }
```
> `actionPlanId` ile plan PDF'i indirilebilir; `resource`/`deliveryType` kaynak gösterimi için.

#### 🔒 GET /api/tasks/{id}  (Authenticated)
Görev detayı. Employee yalnızca kendi görevini görebilir (aksi halde erişim reddi).

#### 🔒 PUT /api/tasks/{id}/status  (EmployeeOnly)
Kanban durumunu günceller.
```json
{ "newStatus": "InProgress" }
```
- Geçerli geçişler: `Pending → InProgress`, `InProgress → Completed`, `Pending → Cancelled`.
- Geçersiz geçiş → **400**.
- Planın tüm görevleri `Completed` olunca plan otomatik `Completed` olur.

---

### 7.6 Health — `api/health`
#### GET /api/health
Servis sağlık durumu (veritabanı + ML servisi). İzleme/health-check için.

---

## BÖLÜM 8 — Frontend İçin Pratik Notlar

1. **Token saklama:** `accessToken` ve `refreshToken`'ı güvenli sakla. Refresh sonrası ikisini de
   yenile (rotation). 401 alınca refresh dene; refresh de başarısızsa login'e yönlendir.
2. **Logout:** Her zaman body'de `refreshToken` gönder; yanıtı beklemeden local state'i
   temizleyebilirsin (idempotent, hata vermez).
3. **employeeId:** UI'da "kendi verisi" akışları için token'daki `employeeId`'yi kullan
   (HR/Admin'de yoktur — bu rollerde çalışan-merkezli ekranları gizle/farklılaştır).
4. **Görev durumları:** Kanban kolonları → `Pending`, `InProgress`, `Completed` (+ `Cancelled`).
   İlk kolon için **`Pending`** kullan (eski `Assigned` artık yok).
5. **Öncelik rozetleri:** `Low` / `Medium` / `High` (artık dinamik dağılır).
6. **ML hatası (503):** Plan üretiminde 503 alırsan kullanıcıya "öneri servisine şu anda
   ulaşılamıyor, sonra tekrar deneyin" mesajını göster; ekranı çökertme.
7. **PDF indirme:** `export-pdf` yanıtını `blob` olarak al, `Content-Disposition` filename'ini
   kullan veya `aksiyon-plani-{id}.pdf` adıyla indir.
8. **Bulk skor gönderimi:** Çalışan/Manager için `evaluatorEmployeeId = kendi employeeId`.
   HR/Admin proxy ise herhangi bir değerlendirici adına gönderebilir; atama yoksa `evaluatorType`
   alanını ekle.
9. **Sayfalama:** `pageNumber` ≥ 1, `pageSize` 1–100. Yanıttaki `totalPages` ile sayfa kontrolü yap.
10. **Correlation Id:** Hata bildirimlerinde yanıt header'ındaki `X-Correlation-Id`'yi ilet —
    backend loglarıyla eşleştirmeyi kolaylaştırır.

---

*Bu doküman backend kaynak kodundan üretilmiştir ve mevcut davranışı yansıtır. Sözleşme
değişikliklerinde güncellenmelidir.*
