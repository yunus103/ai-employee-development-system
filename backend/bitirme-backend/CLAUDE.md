# CLAUDE.md — Bitirme Projesi Backend

Bu dosya Claude Code tarafından her oturumda otomatik okunur.
Projeye başlamadan önce bu dosyayı ve task list'i oku.

---

## Proje Yapısı

```text
C:\Users\erens\Desktop\bitirme-projesi\
├── bitirme-backend\          ← bu proje (ASP.NET Core solution buraya kurulacak)
├── bitirme-ml\
│   └── ml_action_recommendation_service\
│       ├── main.py
│       └── models\
└── docs\
    └── backend_agentic_ai_task_list_v5.md   ← tam task listesi burada
```

---

## Teknoloji Stack

- Backend: ASP.NET Core 9.0 Web API
- Database: PostgreSQL (DB hazır olana kadar Mock Repository kullan)
- ORM: Entity Framework Core + Npgsql
- Authentication: JWT Bearer + Refresh Token (TokenHash olarak sakla)
- Logging: Serilog (Console sink)
- Resilience: Polly (Circuit Breaker — retry KULLANMA)
- PDF: QuestPDF
- Validation: FluentValidation
- Test: xUnit + Moq + FluentAssertions
- ML Service: FastAPI (port 8001)

---

## Solution Yapısı

```text
BitirmeBackend\
├── BitirmeBackend.Api
├── BitirmeBackend.Application
├── BitirmeBackend.Domain
├── BitirmeBackend.Infrastructure
├── BitirmeBackend.Contracts
└── BitirmeBackend.Tests
```

---

## Kritik Kurallar (ASLA İHLAL ETME)

### Mimari
- Controller içine business logic yazma — Application servislerinde olacak
- DTO ve Entity birbirine karıştırma
- FastAPI URL'ini hardcode etme — appsettings'ten oku
- JWT secret ve connection string commit etme — appsettings.example.json şablon

### Veritabanı
- DB hazır olana kadar Mock Repository kullan
- Enum alanları PostgreSQL'de string saklanacak: `HasConversion<string>()`
- IsDeleted = true olan kayıtlar sorgularda varsayılan olarak hariç tutulacak
- Cascade delete yerine restrict/no action kullan kritik tablolarda

### Refresh Token
- Raw token DB'de saklanmaz — SHA256 hash ile `TokenHash` olarak sakla
- Token rotation uygulanacak: kullanılan token revoke edilir, yenisi verilir
- `RevokedAt` ve `ReplacedByTokenHash` alanları entity'de mevcut

### ML Servis
- Polly: sadece circuit breaker + timeout — retry EKLEME
- 503 yakalamak için `OrResult(r => r.StatusCode == HttpStatusCode.ServiceUnavailable)` zorunlu
- FakeMlPredictionClient sadece Development/Demo ortamında — Production'da ASLA
- ML çağrısından önce `IsHealthyAsync()` ile health check yap

### Transaction
- `GenerateDraftActionPlanAsync` transaction içinde çalışacak
- `SendActionPlanToEmployeeAsync` transaction içinde çalışacak
- Send endpoint idempotent olacak — duplicate EmployeeTask üretmeyecek

### EmployeeFeatureDto
- Employee tablosuna competency skoru kolonu EKLEME
- Feature üretimi: Employee + Assessment + AssessmentScore/Competency mapping
- Eksik feature varsa FastAPI'ye gitmeden 400 Bad Request dön, missingFeatures listesi ekle

### ActionPlanItem
- Ayrı Status alanı YOK — silme işlemi IsDeleted soft delete ile
- Item durumu EmployeeTask.Status üzerinden takip edilecek

### PDF
- PDF dosyaları DB'de veya dosya sisteminde saklanmaz
- Her istekte anlık üretilip application/pdf olarak döner

---

## ML Servis Bilgisi

```text
POST http://localhost:8001/predict-actions/top-k?k=13
GET  http://localhost:8001/health
```

Health response:
```json
{
  "status": "ok",
  "model_loaded": true,
  "encoder_loaded": true,
  "feature_columns_loaded": true,
  "label_names_loaded": true
}
```

Model yüklü değilse 503 döner → circuit breaker tetiklenir.

---

## Endpoint Listesi (Özet)

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me

GET  /api/employees?pageNumber=1&pageSize=20
GET  /api/employees/{id}
GET  /api/employees/{id}/features
POST /api/employees
PUT  /api/employees/{id}

GET  /api/assessments/{id}
GET  /api/employees/{employeeId}/assessments
POST /api/assessments
PUT  /api/assessments/{id}/complete
GET  /api/assessments/{id}/scores
POST /api/assessments/{id}/scores
PUT  /api/assessments/{id}/scores/{scoreId}

POST /api/action-plans/generate
GET  /api/action-plans/{id}
GET  /api/employees/{employeeId}/action-plans
PUT  /api/action-plans/{id}/items/{itemId}
POST /api/action-plans/{id}/items
DELETE /api/action-plans/{id}/items/{itemId}
POST /api/action-plans/{id}/approve
POST /api/action-plans/{id}/send
GET  /api/action-plans/{id}/export-pdf

GET  /api/tasks/my
GET  /api/tasks/{id}
PUT  /api/tasks/{id}/status

GET  /api/health
```

---

## AI Önerisi → Final Task Ayrımı (BOZMA)

```text
AiPredictedAction  →  ActionPlanItem  →  EmployeeTask
(ham öneri)           (düzenlenmiş plan)  (çalışana atanan görev)
```

---

## Action Catalog Fallback

Catalog'da bulunamayan code için:
```text
Title:       "Gelişim Aksiyonu: {code}"
Description: "Bu aksiyon için lütfen yöneticinizle iletişime geçin."
Priority:    Medium
```

---

## Şu Anki Durum

- [x] Faz 0 — Solution kurulumu
- [x] Faz 1 — Domain model
- [x] Faz 2 — Contracts / DTO
- [x] Faz 3 — Application interfaces
- [x] Faz 4 — Mock repositories
- [x] Faz 5 — API temel ayarları
- [x] Faz 6 — Authentication
- [x] Faz 7 — Employee API
- [x] Faz 8 — Assessment API
- [x] Faz 9 — ML Service entegrasyonu
- [x] Faz 10 — Action Plan generation
- [x] Faz 11 — Action Plan düzenleme
- [x] Faz 12 — Employee Task API
- [x] Faz 13 — PDF Export
- [ ] Faz 14 — EF Core + PostgreSQL
- [x] Faz 15 — Validation ve güvenlik
- [x] Faz 16 — Testler
- [ ] Faz 17 — Deployment

---

## Her Faz Tamamlandığında

1. `dotnet build` çalıştır — hata varsa düzelt
2. Git commit at: `git commit -m "faz-XX: açıklama"`
3. Bu dosyadaki ilgili fazı `[x]` olarak işaretle
4. Sonraki faza geç
