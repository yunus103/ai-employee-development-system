# Bitirme Projesi Backend Development Task List

Bu doküman, ASP.NET Core 9.0 + PostgreSQL + FastAPI ML Service entegrasyonlu backend geliştirmesini agentic AI araçlarına yaptırmak için hazırlanmıştır.

Amaç: Backend tarafını sıfırdan, katmanlı mimariyle, DB hazır olmadan mock repository ile başlatmak; DB hazır olduğunda EF Core + PostgreSQL entegrasyonuna kolay geçmek; AI model servisini backend'e bağlamak; action plan üretme, düzenleme, çalışana gönderme ve PDF export akışını tamamlamak.

---

## 0. Proje Özeti

### Kullanılacak Teknolojiler

- Backend: ASP.NET Core 9.0 Web API
- Database: PostgreSQL
- ORM: Entity Framework Core + Npgsql
- Authentication: JWT Bearer Authentication + Refresh Token
- Logging: Serilog (Console sink)
- Resilience: Polly (Circuit Breaker)
- API Documentation: Swagger / OpenAPI
- ML Service: Python FastAPI service (LightGBM v1)
- Frontend: React / Next.js, ileride Vercel deployment hedefleniyor
- Backend Deployment: Render veya Docker tabanlı cloud deployment hedefleniyor

### Backend Ana Sorumlulukları

1. Kullanıcı girişi, refresh token ve rol bazlı yetkilendirme
2. Çalışan ve değerlendirme verilerini yönetme
3. Çalışan feature verilerini AI servisine gönderme
4. AI servisinden aksiyon önerileri alma
5. Önerileri draft action plan olarak kaydetme
6. HR/Manager tarafından action plan düzenleme akışını yönetme
7. Final planı çalışana task olarak gönderme
8. Çalışanın kendi görevlerini görmesini ve güncellemesini sağlama
9. Action plan PDF çıktısı üretme
10. Swagger ile tüm endpointleri test edilebilir hale getirme

### Kullanıcı Rolleri

- Admin
- HR
- Manager
- Employee

### Ana Kullanıcı Akışı

1. HR veya Manager sisteme giriş yapar.
2. Çalışanı seçer.
3. Çalışanın değerlendirme/veri bilgileri DB'den alınır.
4. Backend bu verileri AI servisine gönderir.
5. AI servis önerilen aksiyon kodlarını ve olasılıkları döner.
6. Backend bu önerilerden draft action plan oluşturur.
7. HR/Manager action plan üzerinde manuel düzenleme yapabilir.
8. Plan onaylanır.
9. Plan çalışana gönderilir.
10. Çalışan panelinde görevlerini görür ve durumlarını günceller.
11. İstenirse aksiyon planı PDF olarak indirilebilir.

### v5 Ek Netleştirmeleri

Bu versiyonda aşağıdaki konular agentic AI araçlarının daha az hata yapması için netleştirilmiş ve önceki revizyondaki eksikler giderilmiştir:

- Entity ilişkileri ve foreign key özeti
- Enum değerlerinin PostgreSQL'de string olarak saklanması
- Soft delete davranışı
- Transaction gerektiren kritik iş akışları
- Idempotent approve/send kuralları
- Manager yetki kapsamı
- ML feature validation
- Fake ML client kullanım sınırı
- Backend health endpoint
- CorrelationId logging
- PDF dosyalarının DB'de saklanmaması
- EmployeeFeatureDto üretim kuralı
- Refresh token hashleme yaklaşımı
- Polly 503 yakalama düzeltmesi
- Docker Compose bağımlılık netleştirmesi
- Demo fallback ifadesinin profesyonelleştirilmesi


---

## 1. Mimari Karar

Solution yapısı aşağıdaki gibi olmalıdır:

```text
BitirmeBackend
├── BitirmeBackend.Api
├── BitirmeBackend.Application
├── BitirmeBackend.Domain
├── BitirmeBackend.Infrastructure
├── BitirmeBackend.Contracts
└── BitirmeBackend.Tests
```

### Katman Sorumlulukları

#### Api

- Controllers
- Middlewares (Exception, Logging)
- Swagger config
- Authentication/Authorization config
- Dependency injection registrations
- HTTP entry point

#### Application

- Business logic
- Service interfaces and implementations
- Use cases
- Repository interfaces
- External client interfaces
- Validation logic

#### Domain

- Entities
- Enums
- Base classes
- Domain constants

#### Infrastructure

- EF Core DbContext
- PostgreSQL repositories
- Mock repositories
- FastAPI ML service client (Polly ile)
- PDF export implementation (QuestPDF)
- Seed data

#### Contracts

- Request DTOs
- Response DTOs
- Shared DTOs
- API response wrappers

#### Tests

- xUnit unit testleri
- Service testleri (Moq ile)
- ML client fake testleri

---

## 2. Database Relationship Summary

Aşağıdaki ilişki özeti EF Core configuration ve migration aşamalarında referans alınmalıdır. Agentic AI bu ilişkileri bozmayacak şekilde entity navigation property ve foreign key tanımlamalıdır.

```text
User.RoleId -> Role.Id
User.EmployeeId -> Employee.Id nullable

RefreshToken.UserId -> User.Id

Employee.DepartmentId -> Department.Id
Employee.JobRoleId -> JobRole.Id
Employee.ManagerId -> Employee.Id nullable

JobRole.DepartmentId -> Department.Id nullable

Assessment.EmployeeId -> Employee.Id
Assessment.CycleId -> AssessmentCycle.Id
Assessment.CreatedByUserId -> User.Id

AssessmentScore.AssessmentId -> Assessment.Id
AssessmentScore.CompetencyId -> Competency.Id

FeedbackComment.AssessmentId -> Assessment.Id

AiPredictionRun.AssessmentId -> Assessment.Id
AiPredictionRun.ModelVersionId -> ModelVersion.Id
AiPredictionRun.RequestedByUserId -> User.Id

AiPredictedAction.PredictionRunId -> AiPredictionRun.Id

ActionPlan.AssessmentId -> Assessment.Id
ActionPlan.EmployeeId -> Employee.Id
ActionPlan.CreatedByUserId -> User.Id

ActionPlanItem.ActionPlanId -> ActionPlan.Id
ActionPlanItem.ActionCatalogId -> ActionCatalog.Id nullable
ActionPlanItem.AiPredictedActionId -> AiPredictedAction.Id nullable

EmployeeTask.ActionPlanItemId -> ActionPlanItem.Id
EmployeeTask.EmployeeId -> Employee.Id
EmployeeTask.AssignedByUserId -> User.Id

TaskComment.TaskId -> EmployeeTask.Id
TaskComment.UserId -> User.Id
```

Kontrol:

- Foreign key ilişkileri migration sırasında doğru oluşuyor mu?
- Nullable olması gereken ilişkiler nullable bırakıldı mı?
- Cascade delete davranışı yanlışlıkla kritik kayıtları silmeyecek şekilde ayarlandı mı?

Öneri:

- Kritik iş kayıtlarında cascade delete yerine restrict/no action tercih edilsin.
- Silme işlemleri mümkünse soft delete ile yapılsın.

---

## 3. Agentic AI Genel Çalışma Kuralları

Agentic AI geliştirme yaparken aşağıdaki kurallara uyulmalıdır:

1. Her task tamamlandıktan sonra `dotnet build` çalıştırılmalıdır.
2. Endpoint eklendikten sonra Swagger üzerinden manuel test yapılmalıdır.
3. DB henüz hazır değilse mock repository kullanılmalıdır.
4. Controller içinde business logic yazılmamalıdır.
5. Business logic Application servislerinde olmalıdır.
6. Infrastructure dış servisleri ve DB erişimini kapsamalıdır.
7. DTO ve Entity birbirine karıştırılmamalıdır.
8. FastAPI ML servis URL'i hardcoded olmamalı, appsettings üzerinden alınmalıdır.
9. JWT secret ve connection string GitHub'a commit edilmemelidir; `appsettings.example.json` şablon olarak tutulmalıdır.
10. Her yeni endpoint için success ve failure durumları düşünülmelidir.
11. AI'dan gelen action code `action_catalog` içinde bulunamazsa fallback üretilmelidir.
12. AI önerisi ile final task birbirinden ayrı tutulmalıdır: `AiPredictedAction` → `ActionPlanItem` → `EmployeeTask`
13. PDF export core flow tamamlandıktan sonra yapılmalıdır.
14. Deployment son aşamada ele alınmalıdır.
15. ML servis 503 döndüğünde circuit breaker devreye girmelidir; Polly ile retry yapılmamalıdır (model yüklü değilse retry faydasızdır).
16. Tüm liste endpointleri pagination desteklemelidir (pageNumber, pageSize).
17. Refresh token access token ile birlikte dönmeli ve ayrı tabloda tutulmalıdır.
18. Enum alanları PostgreSQL'de string olarak saklanmalıdır (`HasConversion<string>()`).
19. `IsDeleted = true` olan kayıtlar repository sorgularında varsayılan olarak hariç tutulmalıdır.
20. Action plan üretimi ve çalışana gönderme işlemleri transaction içinde yapılmalıdır.
21. Approve ve send endpointleri idempotent olacak şekilde tasarlanmalıdır; duplicate task oluşmamalıdır.
22. FakeMlPredictionClient sadece Development veya Demo ortamında kullanılmalıdır; Production'da ML servis hatası 503 olarak dönmelidir.
23. Backend her istekte `X-Correlation-Id` üretmeli veya gelen değeri kullanmalı, loglara eklemelidir.
24. Backend kendi `/api/health` endpoint'ini sağlamalıdır.
25. PDF dosyaları v1 kapsamında DB'de saklanmamalı, talep üzerine üretilip `application/pdf` olarak döndürülmelidir.
26. `ActionPlanItem` için ayrı bir `Status` alanı kullanılmamalıdır; item silme işlemleri soft delete (`IsDeleted = true`) ile yapılmalıdır.

---

## 4. Faz 0 — Repository ve Solution Kurulumu

### Task 0.1 — GitHub Repository Oluştur

Amaç: Backend kodlarını tutacak ayrı bir repository oluşturmak.

Yapılacaklar:

- GitHub'da `bitirme-backend` isimli repository oluştur.
- `.gitignore` dosyası ekle.
- `README.md` ekle.
- `appsettings.example.json` ekle (gerçek secret'lar olmadan, sadece key şablonu).
- Branch stratejisini belirle:
  - `main`
  - `develop`
  - `feature/*`

Kontrol:

- Repo clone edilebiliyor mu?
- `.gitignore` içinde aşağıdakiler var mı?
  - `bin/`
  - `obj/`
  - `.vs/`
  - `appsettings.Development.json`
  - `.env`
- `appsettings.example.json` commit'e dahil mi?

---

### Task 0.2 — Solution ve Projeleri Oluştur

Komutlar:

```bash
dotnet new sln -n BitirmeBackend

dotnet new webapi -n BitirmeBackend.Api
dotnet new classlib -n BitirmeBackend.Application
dotnet new classlib -n BitirmeBackend.Domain
dotnet new classlib -n BitirmeBackend.Infrastructure
dotnet new classlib -n BitirmeBackend.Contracts
dotnet new xunit -n BitirmeBackend.Tests

dotnet sln add BitirmeBackend.Api
dotnet sln add BitirmeBackend.Application
dotnet sln add BitirmeBackend.Domain
dotnet sln add BitirmeBackend.Infrastructure
dotnet sln add BitirmeBackend.Contracts
dotnet sln add BitirmeBackend.Tests
```

Referanslar:

```bash
dotnet add BitirmeBackend.Api reference BitirmeBackend.Application
dotnet add BitirmeBackend.Api reference BitirmeBackend.Contracts
dotnet add BitirmeBackend.Api reference BitirmeBackend.Infrastructure

dotnet add BitirmeBackend.Application reference BitirmeBackend.Domain
dotnet add BitirmeBackend.Application reference BitirmeBackend.Contracts

dotnet add BitirmeBackend.Infrastructure reference BitirmeBackend.Application
dotnet add BitirmeBackend.Infrastructure reference BitirmeBackend.Domain

dotnet add BitirmeBackend.Tests reference BitirmeBackend.Application
dotnet add BitirmeBackend.Tests reference BitirmeBackend.Infrastructure
```

Kontrol:

```bash
dotnet build
```

Beklenen sonuç: Build hatasız tamamlanmalı.

---

### Task 0.3 — Klasör Yapılarını Oluştur

Api:

```text
Controllers
Middlewares
Extensions
Configurations
```

Application:

```text
Interfaces
Services
UseCases
Mappings
Validators
```

Domain:

```text
Entities
Enums
Common
ValueObjects
```

Infrastructure:

```text
Persistence
Repositories
MockRepositories
ExternalServices
Seed
Configurations
Pdf
```

Contracts:

```text
Requests
Responses
Dtos
Common
```

Kontrol:

- Klasörler doğru projelerde mi?
- Entity'ler Domain altında mı?
- DTO'lar Contracts altında mı?
- DB ve external service kodları Infrastructure altında mı?

---

## 5. Faz 1 — Domain Model

Bu fazda veritabanı hazır olmasa bile backend domain yapısı hazırlanır.

### Task 1.1 — BaseEntity Oluştur

Dosya:

```text
BitirmeBackend.Domain/Common/BaseEntity.cs
```

Alanlar:

```csharp
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
}
```

Kontrol:

- Tüm ana entity'ler bu sınıftan türeyebiliyor mu?
- `dotnet build` başarılı mı?

Soft delete kuralı:

```text
Repository sorguları varsayılan olarak IsDeleted = false kayıtları döndürmelidir.
Delete işlemleri fiziksel silme yerine IsDeleted = true yapmalıdır.
```

---

### Task 1.2 — Enumları Oluştur

Klasör:

```text
BitirmeBackend.Domain/Enums
```

Oluşturulacak enumlar:

```text
UserRoleType
AssessmentStatus
PredictionRunStatus
ActionPlanStatus
ActionPlanItemSource
EmployeeTaskStatus
PriorityLevel
EvaluatorType
```

Önerilen değerler:

```csharp
public enum UserRoleType { Admin = 1, HR = 2, Manager = 3, Employee = 4 }

public enum AssessmentStatus
{
    Draft = 1, Completed = 2, Analyzed = 3,
    ActionPlanGenerated = 4, Approved = 5, SentToEmployee = 6
}

public enum PredictionRunStatus { Pending = 1, Success = 2, Failed = 3 }

public enum ActionPlanStatus
{
    Draft = 1, Edited = 2, Approved = 3, Sent = 4, Completed = 5, Cancelled = 6
}

public enum ActionPlanItemSource { AI = 1, Manual = 2, EditedAI = 3 }

public enum EmployeeTaskStatus { Assigned = 1, InProgress = 2, Completed = 3, Cancelled = 4 }

public enum PriorityLevel { Low = 1, Medium = 2, High = 3 }

public enum EvaluatorType { Self = 1, Manager = 2, Peer = 3, Subordinate = 4 }
```

Kontrol:

- Enumlar Domain katmanında mı?
- `dotnet build` başarılı mı?

EF Core kuralı:

```text
Tüm enum alanları PostgreSQL'de string olarak saklanmalıdır.
Fluent API içinde HasConversion<string>() kullanılmalıdır.
```

---

### Task 1.3 — Role Entity Oluştur

Alanlar:

```text
Id, Name, Description, CreatedAt, UpdatedAt, IsDeleted
```

Kontrol:

- Role entity `BaseEntity`'den türedi mi?
- Admin, HR, Manager, Employee rollerini destekliyor mu?

---

### Task 1.4 — User Entity Oluştur

Alanlar:

```text
FullName, Email, PasswordHash, RoleId, EmployeeId (nullable), IsActive
```

İlişkiler:

```text
User -> Role
User -> Employee (nullable)
```

Kontrol:

- Email alanı var mı?
- PasswordHash response'larda dönmeyecek şekilde tasarlanmalı.
- EmployeeId nullable mı?

---

### Task 1.5 — RefreshToken Entity Oluştur

Dosya:

```text
BitirmeBackend.Domain/Entities/RefreshToken.cs
```

Alanlar:

```text
UserId
TokenHash (string, unique)
ExpiresAt
IsRevoked
CreatedAt
RevokedAt (nullable)
ReplacedByTokenHash (nullable)
```

Not:

Refresh token access token expire olduğunda client tarafından yeni access token almak için kullanılır. Raw refresh token yalnızca client'a döndürülür; DB'de raw token saklanmamalı, hash saklanmalıdır. Token revoke edilebilmeli ve token rotation sırasında eski token geçersiz kılınmalıdır.

Güvenlik kuralı:

```text
Tercih edilen implementasyon TokenHash kullanımıdır.
Demo süresi çok kısıtlıysa raw token geçici olarak kabul edilebilir; ancak v5 master task list için hedef implementasyon TokenHash olmalıdır.
```

Kontrol:

- TokenHash unique constraint için işaretlendi mi?
- Raw token response dışında hiçbir yerde saklanmıyor mu?
- IsRevoked ve RevokedAt ile geçersiz kılma destekleniyor mu?
- ReplacedByTokenHash ile rotation geçmişi tutulabiliyor mu?
- User ile ilişki kuruldu mu?

---

### Task 1.6 — Department Entity Oluştur

Alanlar:

```text
Name, Code, Description
```

Kontrol:

- Employee ile ilişkilendirilebilir mi?
- Seed data eklenebilir mi?

---

### Task 1.7 — JobRole Entity Oluştur

Alanlar:

```text
Name, DepartmentId (nullable), Description
```

Kontrol:

- Department ile opsiyonel ilişki kurulabiliyor mu?

---

### Task 1.8 — Employee Entity Oluştur

Alanlar:

```text
EmployeeCode, FullName, Email, Age, Gender, DepartmentId, JobRoleId,
ManagerId (nullable), Education, EducationField, BusinessTravel, MaritalStatus,
DistanceFromHome, EnvironmentSatisfaction, JobSatisfaction, WorkLifeBalance,
TotalWorkingYears, YearsAtCompany, YearsInCurrentRole, YearsWithCurrManager,
PerformanceScore, Attrition, IsActive
```

Not:

`PerformanceScore`, AI servisinin beklediği feature'lardan biridir. Backend AI request hazırlarken bu alanı göndermelidir.

Kontrol:

- AI feature alanları için gerekli temel bilgiler var mı?
- ManagerId ile yönetici-çalışan ilişkisi kurulabiliyor mu?
- `PerformanceScore` unutulmadı mı?

---

### Task 1.9 — Competency Entity Oluştur

Alanlar:

```text
Code, Name, Category, Description, IsActive
```

Örnek kodlar:

```text
Core_Communication, Core_Teamwork, Core_ProblemSolving, Core_Adaptability,
Core_Initiative, Core_Accountability, Core_LearningAgility, Core_TimeManagement,
Dept_Comp1, Dept_Comp2, Dept_Comp3, Role_Comp1, Role_Comp2
```

Kontrol:

- AI feature üretiminde kullanılabilecek yetkinlikler temsil ediliyor mu?
- Yeni competency eklenebilir mi?

---

### Task 1.10 — AssessmentCycle Entity Oluştur

Alanlar:

```text
Name, StartDate, EndDate, Status
```

Kontrol:

- Dönem bazlı değerlendirme yapılabiliyor mu?

---

### Task 1.11 — Assessment Entity Oluştur

Alanlar:

```text
EmployeeId, CycleId, OverallScore, Status, CreatedByUserId
```

Kontrol:

- Bir çalışanın bir dönemdeki değerlendirmesi tutulabiliyor mu?
- Action plan üretimi bu assessment üzerinden yapılabilir mi?

---

### Task 1.12 — AssessmentScore Entity Oluştur

Alanlar:

```text
AssessmentId, CompetencyId, EvaluatorType, Score
```

Kontrol:

- 360 değerlendirme mantığına uygun mu?
- Aynı competency farklı evaluator tipleri için skor alabiliyor mu?

---

### Task 1.13 — FeedbackComment Entity Oluştur

Alanlar:

```text
AssessmentId, EvaluatorType, CommentText, SentimentScore (nullable)
```

Kontrol:

- Metinsel geri bildirim tutulabiliyor mu?
- İleride NLP sentiment için alan var mı?

---

### Task 1.14 — ModelVersion Entity Oluştur

Alanlar:

```text
ModelName, Version, Description, MicroF1, MacroF1, RocAuc, HammingLoss, IsActive
```

Örnek:

```text
ModelName: LightGBM
Version: Final_LightGBM_v1
```

Kontrol:

- Hangi modelle prediction alındığı izlenebiliyor mu?
- Aktif model belirlenebiliyor mu?

---

### Task 1.15 — AiPredictionRun Entity Oluştur

Alanlar:

```text
AssessmentId, ModelVersionId, RequestedByUserId, Status, ErrorMessage (nullable)
```

Kontrol:

- Her AI çağrısı loglanabiliyor mu?
- Başarılı/başarısız çağrılar takip edilebiliyor mu?

---

### Task 1.16 — AiPredictedAction Entity Oluştur

Alanlar:

```text
PredictionRunId, ActionCode, Probability, RankOrder, IsSelected
```

Kontrol:

- AI'dan dönen ham öneriler kaydediliyor mu?
- Probability ve rank tutuluyor mu?

---

### Task 1.17 — ActionCatalog Entity Oluştur

Alanlar:

```text
Code, Title, Description, Category, DefaultPriority, EstimatedDurationDays, IsActive
```

Örnek action code'lar:

```text
CORE_COMM_03, DEPT_COMP1_03, ROLE_COMP2_03
```

Not:

Action catalog içeriklerini DB tarafını hazırlayacak ekip üyesi dolduracak. Backend fallback desteklemelidir. Code alanı unique olmalıdır.

Kontrol:

- AI action code ile eşleştirme yapılabiliyor mu?
- Code bulunamazsa fallback oluşturulabiliyor mu?
- Code unique constraint için işaretlendi mi?

---

### Task 1.18 — ActionPlan Entity Oluştur

Alanlar:

```text
AssessmentId, EmployeeId, CreatedByUserId, Status, ApprovedAt (nullable), SentAt (nullable)
```

Kontrol:

- Draft, Approved, Sent akışını destekliyor mu?

---

### Task 1.19 — ActionPlanItem Entity Oluştur

Alanlar:

```text
ActionPlanId, ActionCatalogId (nullable), AiPredictedActionId (nullable),
Title, Description, Priority, DueDate (nullable), Source, OrderNo
```

Not:

`Title` ve `Description` snapshot olarak burada tutulmalıdır. Böylece catalog değişirse geçmiş plan bozulmaz.

Status kuralı:

```text
ActionPlanItem için ayrı bir Status alanı kullanılmayacaktır.
Item silme/gizleme işlemleri BaseEntity.IsDeleted soft delete alanı ile yönetilecektir.
Çalışana atandıktan sonraki görev durumu EmployeeTask.Status üzerinden takip edilecektir.
```

Kontrol:

- AI item düzenlenince `Source = EditedAI` yapılabiliyor mu?
- Manuel item için `Source = Manual` destekleniyor mu?

---

### Task 1.20 — EmployeeTask Entity Oluştur

Alanlar:

```text
ActionPlanItemId, EmployeeId, AssignedByUserId, Status, AssignedAt, DueDate, CompletedAt (nullable)
```

Kontrol:

- Çalışana gönderilen görevler takip edilebiliyor mu?

---

### Task 1.21 — TaskComment Entity Oluştur

Alanlar:

```text
TaskId, UserId, CommentText, CreatedAt
```

Kontrol:

- Çalışan veya manager task üzerine yorum bırakabiliyor mu?
- Bu özellik opsiyonel faz olarak da bırakılabilir.

MVP notu:

```text
TaskComment v1 için opsiyoneldir. Zaman kalmazsa entity hazır bırakılıp endpointleri uygulanmayabilir.
```

---

## 6. Faz 2 — Contracts / DTO Tasarımı

### Task 2.1 — Common API Response Modelleri

Dosyalar:

```text
ApiResponse<T>
PagedResponse<T>
ErrorResponse
```

Örnek:

```csharp
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
}

public class PagedResponse<T>
{
    public bool Success { get; set; }
    public IEnumerable<T> Data { get; set; } = [];
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
```

Kontrol:

- Tüm endpoint response'ları standart formatta dönebiliyor mu?
- Sayfalama için TotalPages hesaplanıyor mu?

Pagination kuralı:

```text
pageNumber minimum 1 olmalıdır.
pageSize minimum 1, maksimum 100 olmalıdır.
Varsayılan pageSize 20 olmalıdır.
```

---

### Task 2.2 — Auth DTO'ları

Oluştur:

```text
LoginRequest
LoginResponse
RefreshTokenRequest
RefreshTokenResponse
RegisterUserRequest
CurrentUserResponse
```

`LoginResponse` alanları:

```text
AccessToken
RefreshToken
AccessTokenExpiresAt
UserId
FullName
Email
Role
EmployeeId (nullable)
```

`RefreshTokenRequest` alanları:

```text
RefreshToken (string)
```

`RefreshTokenResponse` alanları:

```text
AccessToken
RefreshToken
AccessTokenExpiresAt
```

Kontrol:

- Frontend login sonrası role, access token ve refresh token alabiliyor mu?
- Refresh token response'u yeni access token içeriyor mu?

---

### Task 2.3 — Employee DTO'ları

Oluştur:

```text
EmployeeListItemDto
EmployeeDetailDto
CreateEmployeeRequest
UpdateEmployeeRequest
EmployeeFeatureDto
```

`EmployeeFeatureDto` FastAPI ile birebir uyumlu olmalıdır:

```text
Age, Attrition, BusinessTravel, Department, DistanceFromHome, Education, EducationField,
EnvironmentSatisfaction, Gender, JobRole, JobSatisfaction, MaritalStatus, WorkLifeBalance,
TotalWorkingYears, YearsAtCompany, YearsInCurrentRole, YearsWithCurrManager, PerformanceScore,
Core_Communication, Core_Teamwork, Core_ProblemSolving, Core_Adaptability, Core_Initiative,
Core_Accountability, Core_LearningAgility, Core_TimeManagement,
Dept_Comp1, Dept_Comp2, Dept_Comp3, Role_Comp1, Role_Comp2
```

Kontrol:

- Bu DTO FastAPI ML servis request formatıyla birebir uyumlu mu?
- `PerformanceScore` var mı?

### Task 2.3.1 — EmployeeFeatureDto Üretim Kuralı

AI servisine gönderilecek `EmployeeFeatureDto` doğrudan sadece `Employee` tablosundan üretilmemelidir. Feature değeri farklı kaynaklardan birleştirilmelidir.

Feature kaynakları:

```text
1. Employee temel alanları:
Age, Attrition, BusinessTravel, Department, DistanceFromHome, Education, EducationField,
EnvironmentSatisfaction, Gender, JobRole, JobSatisfaction, MaritalStatus,
WorkLifeBalance, TotalWorkingYears, YearsAtCompany, YearsInCurrentRole, YearsWithCurrManager

2. Assessment alanları:
PerformanceScore veya Assessment.OverallScore

3. AssessmentScore + Competency.Code mapping:
Core_Communication, Core_Teamwork, Core_ProblemSolving, Core_Adaptability,
Core_Initiative, Core_Accountability, Core_LearningAgility, Core_TimeManagement,
Dept_Comp1, Dept_Comp2, Dept_Comp3, Role_Comp1, Role_Comp2
```

Mapping kuralı:

```text
Backend, AssessmentScore kayıtlarını Competency.Code alanına göre EmployeeFeatureDto alanlarına map etmelidir.
Örneğin Competency.Code = Core_Communication ise Score değeri EmployeeFeatureDto.Core_Communication alanına yazılmalıdır.
Eksik required feature varsa AI çağrısı yapılmadan 400 Bad Request dönülmelidir.
Response içinde missingFeatures listesi bulunmalıdır.
```

Kontrol:

- Competency skorları yanlışlıkla Employee tablosuna kolon olarak eklenmedi mi?
- Feature üretimi Employee + Assessment + AssessmentScore kaynaklarından yapılıyor mu?
- `PerformanceScore` alanı Assessment.OverallScore veya ilgili hesaplanmış skordan doğru geliyor mu?
- Eksik feature durumunda FastAPI'ye gitmeden 400 dönülüyor mu?

---

### Task 2.4 — Assessment DTO'ları

Oluştur:

```text
AssessmentDetailDto
CreateAssessmentRequest
UpdateAssessmentStatusRequest
AssessmentScoreDto
FeedbackCommentDto
```

Kontrol:

- Assessment detay ekranı için yeterli veri dönüyor mu?

---

### Task 2.5 — ML Service DTO'ları

Oluştur:

```text
MlPredictionRequest
MlPredictionFeatureDto
MlRecommendedActionDto
MlPredictionResponse
```

FastAPI beklenen request formatı:

```json
{
  "employeeId": 101,
  "features": {
    "Age": 32,
    "Attrition": "No",
    ...
  }
}
```

FastAPI response formatı:

```json
{
  "employeeId": 101,
  "recommendedActions": [
    { "code": "DEPT_COMP1_03", "probability": 0.931633, "selected": true }
  ],
  "totalRecommendedActions": 13
}
```

Not:

FastAPI servisi `/health` endpoint'i sağlamaktadır. Bu endpoint `model_loaded`, `encoder_loaded`, `feature_columns_loaded`, `label_names_loaded` alanlarını döner. Backend bu bilgiyi kullanarak servise istek göndermeden önce hazır olup olmadığını anlayabilir.

FastAPI model yüklü değilse `503` döner. Bu durum Polly circuit breaker ile ele alınmalıdır.

Kontrol:

- JSON alan adları FastAPI ile uyumlu mu? (camelCase)
- Probability double olarak tutuluyor mu?

---

### Task 2.6 — Action Plan DTO'ları

Oluştur:

```text
GenerateActionPlanRequest
GenerateActionPlanResponse
ActionPlanDetailDto
ActionPlanItemDto
UpdateActionPlanItemRequest
AddManualActionPlanItemRequest
ApproveActionPlanRequest
SendActionPlanRequest
```

Kontrol:

- Draft plan frontend'de listelenebilir mi?
- Item ekleme, silme, düzenleme DTO'ları var mı?

---

### Task 2.7 — Employee Task DTO'ları

Oluştur:

```text
EmployeeTaskDto
UpdateEmployeeTaskStatusRequest
TaskCommentDto
```

Kontrol:

- Employee kendi görevlerini görebiliyor mu?
- Task status update request'i yeterli mi?

---

## 7. Faz 3 — Application Interface ve Service Katmanı

### Task 3.1 — Repository Interface'leri Oluştur

Klasör:

```text
BitirmeBackend.Application/Interfaces/Repositories
```

Interface'ler:

```text
IUserRepository
IRoleRepository
IEmployeeRepository
IAssessmentRepository
IActionCatalogRepository
IModelVersionRepository
IAiPredictionRepository
IActionPlanRepository
IEmployeeTaskRepository
IRefreshTokenRepository
IUnitOfWork
```

Kontrol:

- Application katmanı EF Core'a bağımlı değil mi?
- Mock ve gerçek repository aynı interface'i kullanabiliyor mu?
- `IRefreshTokenRepository` eklendi mi?

---

### Task 3.2 — External ML Client Interface Oluştur

```csharp
public interface IMlPredictionClient
{
    Task<MlPredictionResponse> PredictActionsTopKAsync(MlPredictionRequest request, int k = 13);
    Task<bool> IsHealthyAsync();
}
```

Not:

`IsHealthyAsync()` FastAPI `/health` endpoint'ini çağırır ve `model_loaded == true` kontrolü yapar.

Kontrol:

- ML servisi soyutlandı mı?
- Fake client yazmak mümkün mü?
- Health check metodu eklendi mi?

---

### Task 3.3 — Auth Service Interface'leri

Oluştur:

```text
IAuthService
ITokenService
IPasswordHasher
IRefreshTokenService
```

`ITokenService` metotları:

```text
GenerateAccessToken(User user) -> string
GenerateRefreshToken() -> string
GetPrincipalFromExpiredToken(string token) -> ClaimsPrincipal
```

`IRefreshTokenService` metotları:

```text
CreateRefreshTokenAsync(int userId, string token, DateTime expiresAt)
ValidateRefreshTokenAsync(int userId, string token) -> bool
RevokeRefreshTokenAsync(int userId, string token)
RevokeAllUserTokensAsync(int userId)
```

Kontrol:

- Login logic controller içinde değil service içinde mi olacak?
- Refresh token revoke edilebiliyor mu?

---

### Task 3.4 — Employee Service Interface

Metotlar:

```text
GetEmployeesAsync(int pageNumber, int pageSize)
GetEmployeeByIdAsync(int id)
CreateEmployeeAsync(CreateEmployeeRequest request)
UpdateEmployeeAsync(int id, UpdateEmployeeRequest request)
GetEmployeeFeaturesForPredictionAsync(int employeeId)
```

Kontrol:

- AI'ya gönderilecek feature DTO üretilebiliyor mu?
- Pagination destekleniyor mu?

---

### Task 3.5 — Assessment Service Interface

Metotlar:

```text
GetAssessmentByIdAsync(int id)
CreateAssessmentAsync(CreateAssessmentRequest request)
CompleteAssessmentAsync(int id)
GetAssessmentScoresAsync(int assessmentId)
GetEmployeeAssessmentsAsync(int employeeId, int pageNumber, int pageSize)
```

Kontrol:

- Assessment status yönetilebiliyor mu?
- Pagination destekleniyor mu?

---

### Task 3.6 — Action Plan Service Interface

Metotlar:

```text
GenerateDraftActionPlanAsync(GenerateActionPlanRequest request)
GetActionPlanByIdAsync(int id)
UpdateActionPlanItemAsync(int planId, int itemId, UpdateActionPlanItemRequest request)
AddManualItemAsync(int planId, AddManualActionPlanItemRequest request)
RemoveItemAsync(int planId, int itemId)
ApproveActionPlanAsync(int id)
SendActionPlanToEmployeeAsync(int id)
```

Kontrol:

- AI önerisinden draft action plan üretme akışı servis içinde mi?

---

### Task 3.7 — Employee Task Service Interface

Metotlar:

```text
GetMyTasksAsync(int employeeId, int pageNumber, int pageSize)
UpdateTaskStatusAsync(int taskId, int employeeId, EmployeeTaskStatus newStatus)
GetTaskDetailAsync(int taskId, int requestingUserId)
```

Kontrol:

- Employee kendi görevlerini görebiliyor mu?
- Pagination destekleniyor mu?

---

### Task 3.8 — PDF Export Service Interface

```csharp
public interface IPdfExportService
{
    Task<byte[]> GenerateActionPlanPdfAsync(int actionPlanId);
}
```

Kontrol:

- PDF export ayrı servis olarak soyutlandı mı?

---

## 8. Faz 4 — Mock Repository ile DB Beklemeden Geliştirme

### Task 4.1 — Mock Repository Klasörü Oluştur

Klasör:

```text
BitirmeBackend.Infrastructure/MockRepositories
```

Mocklar:

```text
MockUserRepository
MockRoleRepository
MockEmployeeRepository
MockAssessmentRepository
MockActionCatalogRepository
MockModelVersionRepository
MockAiPredictionRepository
MockActionPlanRepository
MockEmployeeTaskRepository
MockRefreshTokenRepository
MockUnitOfWork
```

Kontrol:

- Uygulama PostgreSQL olmadan çalışıyor mu?
- `MockRefreshTokenRepository` eklendi mi?

---

### Task 4.2 — Mock Kullanıcı ve Rol Verisi Oluştur

Minimum kullanıcılar:

```text
admin@demo.com  / Admin123!
hr@demo.com     / Hr1234!
manager@demo.com / Manager1!
employee@demo.com / Emp1234!
```

Her kullanıcı için `RefreshToken` tablosu boş başlar, login ile dolar.

Kontrol:

- Mock login yapılabiliyor mu?
- Kullanıcıların rolleri doğru mu?

---

### Task 4.3 — Mock Employee Data Oluştur

En az 3 çalışan oluştur. Her çalışanda AI feature için gerekli tüm alanlar eksiksiz olmalı.

Kontrol:

- `GET /api/employees/{id}/features` eksiksiz veri dönebilir mi?
- Null AI feature alanı yok mu?

---

### Task 4.4 — Mock Action Catalog Data Oluştur

En az şu kodlara karşılık title/description ekle (FastAPI'nin döndüğü gerçek kodlarla eşleşmeli):

```text
DEPT_COMP1_03, ROLE_COMP1_03, ROLE_COMP2_03, DEPT_COMP3_03,
CORE_ACCT_04, CORE_INIT_03, CORE_TIME_03, DEPT_COMP2_03,
CORE_COMM_03, CORE_LEARN_04, CORE_TEAM_04, CORE_ADAPT_03, CORE_PROB_04
```

Kontrol:

- AI'dan gelen 13 action code'un çoğu catalog ile eşleşiyor mu?
- Eşleşmeyenlerde fallback çalışıyor mu?

Kapsam notu:

```text
Mock aşamada demo response içinde dönen en az 13 kod eklenmelidir.
Gerçek DB seed aşamasında modelin üretebildiği tüm action label'lar action_catalog içine eklenmelidir.
Model toplam 47 label üretebildiği için yalnızca bu 13 kodla sınırlı kalınmamalıdır.
Eksik kalan kodlarda fallback çalışmalıdır.
```

---

### Task 4.5 — Fake ML Client Oluştur

Dosya:

```text
BitirmeBackend.Infrastructure/ExternalServices/FakeMlPredictionClient.cs
```

13 sabit action kodu ile sabit probability değerleri döner. ML servisi olmadan action plan üretimi test edilebilmeli.

Demo fallback: ML servis down olduğunda bu fake client devreye alınabilir.

Kritik sınır:

```text
FakeMlPredictionClient sadece Development veya Demo ortamında kullanılmalıdır.
Production ortamında ML servis başarısız olursa sahte öneri dönülmemeli, frontend'e açık bir 503 hatası dönülmelidir.
```

Kontrol:

- 13 aksiyon dönüyor mu?
- `IsHealthyAsync()` her zaman `true` dönüyor mu?

---

## 9. Faz 5 — API Temel Ayarları

### Task 5.1 — Swagger Aktifleştir

JWT auth için Swagger'a Bearer token desteği ekle.

Kontrol:

- `/swagger` açılıyor mu?
- Tüm controller endpointleri listeleniyor mu?
- Swagger'dan JWT token girip korumalı endpoint test edilebiliyor mu?

---

### Task 5.2 — CORS Ayarla

Development origin:

```text
http://localhost:3000
```

Production origin daha sonra Vercel URL olarak eklenecek (`AllowedOrigins` environment variable ile).

Kontrol:

- Frontend local'den API çağrısı yapabiliyor mu?

---

### Task 5.3 — Global Exception Middleware Oluştur

Dosya:

```text
BitirmeBackend.Api/Middlewares/ExceptionHandlingMiddleware.cs
```

Hatalar standart `ApiResponse` formatında dönmeli. Stack trace production'da dönmemeli.

Hata tipleri:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
500 Internal Server Error
503 External Service Unavailable (ML servis down)
```

Kontrol:

- Bilerek hatalı request gönderildiğinde standart error response dönüyor mu?
- 500 hatasında stack trace response body'de görünmüyor mu?
- ML servis 503 döndüğünde frontend anlamlı mesaj alıyor mu?

---

### Task 5.4 — Serilog Ekle ve Yapılandır

NuGet:

```bash
dotnet add BitirmeBackend.Api package Serilog.AspNetCore
dotnet add BitirmeBackend.Api package Serilog.Sinks.Console
```

`Program.cs` başına ekle:

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();
```

Loglanacaklar (minimum):

```text
Her HTTP request (method, path, status code, elapsed ms)
ML service çağrısı başlangıç ve sonucu
ML service hataları (503, timeout, circuit breaker açık)
Auth hataları (başarısız login, geçersiz token)
Unhandled exception (middleware içinden)
```

Kontrol:

- Console'da structured log görünüyor mu?
- ML servis hataları loglanıyor mu?
- Başarısız login denemeleri loglanıyor mu?

---

### Task 5.5 — CorrelationId Middleware Oluştur

Amaç: Backend, frontend, loglar ve ML servis çağrıları arasında takip edilebilirlik sağlamak.

Kural:

```text
Request header içinde X-Correlation-Id varsa kullanılmalıdır.
Yoksa backend yeni bir correlation id üretmelidir.
Response header içine X-Correlation-Id eklenmelidir.
Serilog loglarına correlation id yazılmalıdır.
ML servis çağrılarında da aynı correlation id loglanmalıdır.
```

Kontrol:

- Swagger veya Postman ile `X-Correlation-Id` gönderildiğinde response header'da aynı değer dönüyor mu?
- Header gönderilmediğinde backend yeni değer üretiyor mu?
- Console loglarında correlation id görünüyor mu?

---

### Task 5.6 — Backend Health Endpoint Oluştur

Endpoint:

```text
GET /api/health
```

Mock geliştirme sırasında örnek response:

```json
{
  "status": "degraded",
  "database": "mock",
  "mlService": "ok"
}
```

DB hazır olduğunda örnek response:

```json
{
  "status": "ok",
  "database": "ok",
  "mlService": "ok"
}
```

HTTP status kuralı:

```text
Backend çalışıyor ama ML servis kapalıysa HTTP 200 + status = "degraded" dönülebilir.
Backend kritik bağımlılıkları tamamen kullanılamıyorsa HTTP 503 dönülmelidir.
Mock geliştirme sırasında database = "mock" olarak belirtilmelidir.
```

Kontrol:

- Backend çalışırken `/api/health` 200 dönüyor mu?
- ML servis kapalıyken `mlService` alanı bunu gösterebiliyor mu?
- Degraded durumda response açık ve anlaşılır mı?
- Deploy öncesi health endpoint kullanılabiliyor mu?

---

### Task 5.7 — appsettings Ayarları

`appsettings.json`:

```json
{
  "Jwt": {
    "Secret": "CHANGE_ME_DEV_SECRET_MIN_32_CHARS",
    "Issuer": "BitirmeBackend",
    "Audience": "BitirmeFrontend",
    "AccessTokenExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7
  },
  "MlService": {
    "BaseUrl": "http://localhost:8001",
    "TimeoutSeconds": 30,
    "CircuitBreakerFailureThreshold": 3,
    "CircuitBreakerDurationSeconds": 60
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=bitirme_db;Username=postgres;Password=postgres"
  },
  "AllowedOrigins": "http://localhost:3000"
}
```

`appsettings.example.json` (GitHub'a commit edilecek şablon):

```json
{
  "Jwt": {
    "Secret": "YOUR_SECRET_HERE_MIN_32_CHARS",
    "Issuer": "BitirmeBackend",
    "Audience": "BitirmeFrontend",
    "AccessTokenExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7
  },
  "MlService": {
    "BaseUrl": "http://localhost:8001",
    "TimeoutSeconds": 30,
    "CircuitBreakerFailureThreshold": 3,
    "CircuitBreakerDurationSeconds": 60
  },
  "ConnectionStrings": {
    "DefaultConnection": "YOUR_POSTGRES_CONNECTION_STRING"
  },
  "AllowedOrigins": "http://localhost:3000"
}
```

Render veya Docker deployment için gerekli ek environment variable:

```text
ASPNETCORE_ENVIRONMENT=Production
```

Bu değişken set edilmezse uygulama Development ortamında çalışır ve FakeMlPredictionClient production'da yanlışlıkla devreye girebilir.

Kontrol:

- ML service URL appsettings'ten okunuyor mu?
- Refresh token süreleri configurable mı?
- Secret production'da environment variable ile değiştirilebilir mi?
- `ASPNETCORE_ENVIRONMENT=Production` Render env variables içinde set edildi mi?

---

## 10. Faz 6 — Authentication ve Authorization

### Task 6.1 — JWT ve Polly Paketlerini Ekle

```bash
dotnet add BitirmeBackend.Api package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add BitirmeBackend.Infrastructure package Microsoft.Extensions.Http.Polly
```

Kontrol:

```bash
dotnet build
```

---

### Task 6.2 — Password Hasher Oluştur

BCrypt veya ASP.NET PasswordHasher kullan.

Kontrol:

- Hash ve verify işlemleri çalışıyor mu?

---

### Task 6.3 — Token Service Oluştur

JWT claims:

```text
UserId, Email, Role, EmployeeId
```

Access token süresi: `appsettings` `AccessTokenExpirationMinutes` değerinden alınmalı.

Kontrol:

- Token decode edildiğinde claimler görünüyor mu?
- `GetPrincipalFromExpiredToken` expire olmuş tokeni parse edebiliyor mu?

---

### Task 6.4 — Refresh Token Service Implementasyonu

```text
BitirmeBackend.Infrastructure/Repositories/RefreshTokenRepository.cs
```

İş kuralları:

- Bir kullanıcı login olduğunda yeni refresh token oluşturulur.
- Eski refresh tokenlar revoke edilmez (multiple device desteği).
- Token kullanıldıktan sonra yenisiyle değiştirilir (token rotation).
- Expire olmuş token kullanılırsa 401 dönülür.

Kontrol:

- Token rotation çalışıyor mu?
- Expire olmuş token reddediliyor mu?

---

### Task 6.5 — AuthController Oluştur

Endpointler:

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

`POST /api/auth/refresh` iş akışı:

1. Request body'den refresh token al.
2. Gelen raw refresh token hashlenir; DB'de TokenHash var mı ve geçerli mi kontrol edilir.
3. Geçerliyse yeni access token + yeni refresh token üret (rotation).
4. Eski refresh token hash kaydını revoke et.
5. Yeni token çiftini dön.

`POST /api/auth/logout`:

- İlgili refresh token hash kaydını revoke et.

Kontrol:

- Doğru login access + refresh token dönüyor mu?
- Yanlış login 401 dönüyor mu?
- `/me` token olmadan 401 dönüyor mu?
- Refresh endpoint geçerli token ile yeni token döndürüyor mu?
- Geçersiz/expire refresh token ile 401 dönüyor mu?
- Logout sonrası aynı refresh token reddediliyor mu?

---

### Task 6.6 — Role Policy Ekle

Policy'ler:

```text
AdminOnly
HrOrManager
EmployeeOnly
Authenticated
```

Kontrol:

- Employee, HR endpointlerine erişemiyor mu?
- HR action plan generate edebiliyor mu?

Manager yetki kuralı:

```text
Manager sadece Employee.ManagerId == manager kullanıcısının EmployeeId değeri olan çalışanlara erişebilir.
HR ve Admin tüm çalışanlara erişebilir.
Employee sadece kendi profilini, assessmentlarını ve tasklarını görebilir.
```

---

## 11. Faz 7 — Employee API

### Task 7.1 — EmployeesController Oluştur

Endpointler:

```text
GET  /api/employees?pageNumber=1&pageSize=20
GET  /api/employees/{id}
POST /api/employees
PUT  /api/employees/{id}
GET  /api/employees/{id}/features
```

Kontrol:

- Liste ve detay dönüyor mu?
- Pagination çalışıyor mu? (`TotalCount`, `TotalPages` geliyor mu?)
- Feature endpoint ML request formatıyla uyumlu mu?

---

### Task 7.2 — Employee Feature Response Kontrolü

Feature response'da şu alanlar eksiksiz olmalı:

```text
Age, Attrition, BusinessTravel, Department, DistanceFromHome, Education, EducationField,
EnvironmentSatisfaction, Gender, JobRole, JobSatisfaction, MaritalStatus, WorkLifeBalance,
TotalWorkingYears, YearsAtCompany, YearsInCurrentRole, YearsWithCurrManager, PerformanceScore,
Core_Communication, Core_Teamwork, Core_ProblemSolving, Core_Adaptability, Core_Initiative,
Core_Accountability, Core_LearningAgility, Core_TimeManagement,
Dept_Comp1, Dept_Comp2, Dept_Comp3, Role_Comp1, Role_Comp2
```

Kontrol:

- Eksik alan yok mu?
- Null değerler AI servise gitmeden önce ele alınıyor mu?

ML feature validation kuralı:

```text
AI servisine istek atmadan önce tüm required feature alanları kontrol edilmelidir.
Eksik veya null zorunlu alan varsa 400 Bad Request dönülmeli ve missingFeatures listesi response'a eklenmelidir.
Özellikle PerformanceScore alanı unutulmamalıdır.
```

---

## 12. Faz 8 — Assessment API

### Task 8.1 — AssessmentsController Oluştur

Endpointler:

```text
GET  /api/assessments/{id}
GET  /api/employees/{employeeId}/assessments?pageNumber=1&pageSize=10
POST /api/assessments
PUT  /api/assessments/{id}/complete
GET  /api/assessments/{id}/scores
POST /api/assessments/{id}/scores
PUT  /api/assessments/{id}/scores/{scoreId}
```

Kontrol:

- Assessment detail dönüyor mu?
- Completed status'a geçebiliyor mu?
- Competency skorları girilebiliyor mu?
- 0-5 arası validation var mı?

---

## 13. Faz 9 — ML Service Entegrasyonu (Polly ile)

### Task 9.1 — Polly Circuit Breaker Ekle

Kural:

- ML servis art arda `CircuitBreakerFailureThreshold` kez 503 dönerse circuit breaker açılır.
- `CircuitBreakerDurationSeconds` süre boyunca tüm istekler direkt hata döner.
- Circuit breaker açıkken loglama yapılmalıdır.

NOT: Polly ile retry eklenmemelidir. ML servis 503 döndüğünde model yüklü değildir, retry boşunadır. Sadece circuit breaker + timeout kullanılmalıdır.

```csharp
using System.Net;
using Polly;

builder.Services.AddHttpClient<IMlPredictionClient, MlPredictionClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["MlService:BaseUrl"]!);
    client.Timeout = TimeSpan.FromSeconds(
        builder.Configuration.GetValue<int>("MlService:TimeoutSeconds"));
})
.AddPolicyHandler(Policy<HttpResponseMessage>
    .Handle<HttpRequestException>()
    .Or<TaskCanceledException>()
    .OrResult(response => response.StatusCode == HttpStatusCode.ServiceUnavailable)
    .CircuitBreakerAsync(
        handledEventsAllowedBeforeBreaking: builder.Configuration.GetValue<int>("MlService:CircuitBreakerFailureThreshold"),
        durationOfBreak: TimeSpan.FromSeconds(
            builder.Configuration.GetValue<int>("MlService:CircuitBreakerDurationSeconds"))
    ));
```

Önemli not:

```text
Sadece exception yakalamak yeterli değildir; FastAPI 503 response döndürdüğünde bu response exception olarak fırlamayabilir.
Bu nedenle OrResult(response => response.StatusCode == HttpStatusCode.ServiceUnavailable) kuralı zorunludur.
```

Kontrol:

- 3 başarısız istek sonrası circuit breaker açılıyor mu?
- Açık circuit'te istek gönderilmeden hata dönüyor mu?

---

### Task 9.2 — MlPredictionClient Implementasyonu

Klasör:

```text
BitirmeBackend.Infrastructure/ExternalServices/MlPredictionClient.cs
```

İki endpoint'i de desteklemelidir:

```text
POST /predict-actions/top-k?k=13  (kullanılan ana endpoint)
POST /predict-actions              (tüm positive predictionlar)
```

`IsHealthyAsync()` implementasyonu:

```text
GET /health endpoint'ini çağır.
model_loaded, encoder_loaded, feature_columns_loaded, label_names_loaded hepsini kontrol et.
Hepsi true ise true dön.
```

Kontrol:

- FastAPI çalışırken response alınıyor mu?
- FastAPI model yüklü değilken 503 alınıyor ve circuit breaker tetikleniyor mu?
- FastAPI kapalıyken timeout sonrası anlamlı hata dönüyor mu?

---

### Task 9.3 — ML Request Mapping

`EmployeeFeatureDto` şu formata çevrilmeli:

```json
{
  "employeeId": 101,
  "features": { "Age": 32, "PerformanceScore": 3.5, ... }
}
```

Kontrol:

- `features` objesinde tüm feature'lar var mı?
- Categorical field'lar string mi? (Attrition: "No", Gender: "Male")

Ek kontrol:

- Backend, FastAPI'den `missing_features` hatası almadan önce kendi tarafında eksik feature kontrolü yapıyor mu?

---

### Task 9.4 — ML Response Mapping

Kontrol:

- 13 aksiyon geliyor mu?
- Probability değerleri korunuyor mu?
- `selected: true` olan aksiyonlar doğru parse ediliyor mu?

---

## 14. Faz 10 — Action Plan Generation

### Task 10.1 — Generate Action Plan Endpoint Oluştur

Endpoint:

```text
POST /api/action-plans/generate
```

Request:

```json
{ "assessmentId": 1, "topK": 13 }
```

İş akışı:

1. Assessment bulunur.
2. Employee bulunur.
3. ML servis health check yapılır (`IsHealthyAsync()`).
4. Employee feature DTO oluşturulur.
5. ML servisi çağrılır (circuit breaker ile).
6. AI prediction run kaydı oluşturulur.
7. AI predicted actions kaydedilir.
8. Action catalog mapping yapılır.
9. Draft action plan oluşturulur.
10. Action plan items oluşturulur.
11. Draft plan response olarak döner.

Kontrol:

- ML çalışırken draft plan oluşuyor mu?
- ML kapalıyken 503 ile anlamlı hata dönüyor mu?
- Action catalog'da olmayan code için fallback çalışıyor mu?
- Aynı assessment için ikinci plan üretimi uyarı veriyor mu?

Transaction kuralı:

```text
GenerateDraftActionPlanAsync transaction içinde çalışmalıdır.
AiPredictionRun, AiPredictedAction, ActionPlan ve ActionPlanItem kayıtlarından herhangi biri başarısız olursa işlem tutarlı şekilde rollback edilmelidir.
ML çağrısı başarılı olup DB yazımı başarısız olursa hata loglanmalı ve kullanıcıya standart hata dönülmelidir.
```

Duplicate plan kuralı:

```text
Bir assessment için Draft, Edited, Approved veya Sent durumunda bir action plan varsa varsayılan olarak yeni plan üretilmemelidir.
Gerekirse ileride ayrı bir endpoint eklenebilir: POST /api/action-plans/{id}/regenerate
```

Öneri:

- Mevcut draft plan varsa yeni üretimden önce kullanıcıya uyarı dön.

---

### Task 10.2 — AI Prediction Run Kaydet

Mock ortamda bile bu kayıt mantığı kurulmalı.

Kaydedilecekler:

```text
AssessmentId, ModelVersionId, RequestedByUserId, Status, CreatedAt
```

Kontrol:

- Her AI çağrısı takip ediliyor mu?
- Başarısız çağrılarda `Status = Failed` ve `ErrorMessage` dolduruluyor mu?

---

### Task 10.3 — AI Predicted Actions Kaydet

Her öneri için:

```text
ActionCode, Probability, RankOrder, IsSelected
```

Kontrol:

- Rank probability'ye göre sıralı mı?

---

### Task 10.4 — Draft Action Plan Item Oluştur

Her AI önerisi için:

```text
Source = AI
Title = action_catalog title veya fallback ("Action: {code}")
Description = action_catalog description veya fallback
Priority = catalog DefaultPriority veya Medium
```

Kontrol:

- Frontend'e boş title/description dönmüyor mu?

---

## 15. Faz 11 — Action Plan Düzenleme

### Task 11.1 — ActionPlansController Oluştur

Endpointler:

```text
GET    /api/action-plans/{id}
GET    /api/employees/{employeeId}/action-plans
PUT    /api/action-plans/{id}/items/{itemId}
POST   /api/action-plans/{id}/items
DELETE /api/action-plans/{id}/items/{itemId}
POST   /api/action-plans/{id}/approve
POST   /api/action-plans/{id}/send
```

Kontrol:

- Plan detail geliyor mu?
- Item güncelleniyor mu?
- Manuel item ekleniyor mu?
- Item siliniyor mu?

---

### Task 11.2 — Update Item Logic

Güncellenebilecek alanlar:

```text
Title, Description, Priority, DueDate, OrderNo
```

Kural: Eğer item source `AI` ise ve düzenlendiyse `Source = EditedAI` yapılmalıdır.

Kontrol:

- AI item düzenlenince `EditedAI` oluyor mu?

---

### Task 11.3 — Manual Item Ekleme

Kural:

```text
Source = Manual
AiPredictedActionId = null
ActionCatalogId nullable
```

Kontrol:

- Title zorunlu mu?
- Manuel item plan detail içinde görünüyor mu?

---

### Task 11.4 — Approve Plan

Status geçişi:

```text
Draft / Edited -> Approved
```

Kontrol:

- Boş plan approve edilemiyor mu?
- ApprovedAt set ediliyor mu?

Idempotency kuralı:

```text
Plan zaten Approved veya Sent ise tekrar approve işlemi duplicate veya hatalı durum oluşturmamalıdır.
Zaten onaylı plan için mevcut plan bilgisi dönülebilir veya 409 Conflict verilebilir; davranış dokümante edilmelidir.
```

---

### Task 11.5 — Send Plan To Employee

Status geçişi:

```text
Approved -> Sent
```

Ayrıca her action plan item için `EmployeeTask` oluşturulmalıdır.

Kontrol:

- SentAt set ediliyor mu?
- EmployeeTask kayıtları oluşuyor mu?

Transaction ve idempotency kuralı:

```text
SendActionPlanToEmployeeAsync transaction içinde çalışmalıdır.
ActionPlan status update ve EmployeeTask oluşturma tek transaction içinde yapılmalıdır.
Plan zaten Sent ise aynı tasklar tekrar oluşturulmamalıdır. Endpoint duplicate EmployeeTask üretmeyecek şekilde idempotent olmalıdır.
```

---

## 16. Faz 12 — Employee Task API

### Task 12.1 — EmployeeTasksController Oluştur

Endpointler:

```text
GET /api/tasks/my?pageNumber=1&pageSize=20
GET /api/tasks/{id}
PUT /api/tasks/{id}/status
```

Kontrol:

- Employee sadece kendi tasklarını görüyor mu?
- Pagination çalışıyor mu?

---

### Task 12.2 — Task Status Update

Geçerli status geçişleri:

```text
Assigned -> InProgress
InProgress -> Completed
Assigned -> Cancelled
```

Kontrol:

- CompletedAt sadece Completed olduğunda set ediliyor mu?
- Geçersiz status geçişleri 400 ile reddediliyor mu?

---

## 17. Faz 13 — PDF Export

### Task 13.1 — QuestPDF Ekle

```bash
dotnet add BitirmeBackend.Infrastructure package QuestPDF
```

Kontrol:

- Projeye paket eklendi mi?
- Basit bir test PDF üretilebiliyor mu?

---

### Task 13.2 — Action Plan PDF Endpoint Oluştur

Endpoint:

```text
GET /api/action-plans/{id}/export-pdf
```

Response: `application/pdf`

PDF içeriği:

```text
Çalışan adı, Departman, Pozisyon
Assessment dönemi
Aksiyon planı oluşturma ve onay tarihleri
Task listesi (Title, Priority, Due Date, Source, EmployeeTask Status varsa)
```

Kontrol:

- PDF indirilebiliyor mu?
- Türkçe karakterler düzgün görünüyor mu?

Storage kuralı:

```text
PDF dosyaları v1 kapsamında DB'de veya dosya sisteminde kalıcı saklanmayacaktır.
Her istek geldiğinde anlık üretilecek ve application/pdf olarak döndürülecektir.
```

---

## 18. Faz 14 — EF Core + PostgreSQL Entegrasyonu

Bu faz DB hazır olduğunda yapılacaktır.

### Task 14.1 — EF Core Paketlerini Ekle

```bash
dotnet add BitirmeBackend.Infrastructure package Microsoft.EntityFrameworkCore
dotnet add BitirmeBackend.Infrastructure package Microsoft.EntityFrameworkCore.Design
dotnet add BitirmeBackend.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL
```

---

### Task 14.2 — AppDbContext Oluştur

DbSet'ler:

```text
Users, Roles, RefreshTokens, Employees, Departments, JobRoles,
AssessmentCycles, Assessments, AssessmentScores, Competencies, FeedbackComments,
ModelVersions, AiPredictionRuns, AiPredictedActions, ActionCatalog,
ActionPlans, ActionPlanItems, EmployeeTasks, TaskComments
```

Kontrol:

- Tüm entity'ler DbSet olarak eklendi mi?
- `RefreshTokens` DbSet eklendi mi?

---

### Task 14.3 — Entity Configurations Oluştur

Fluent API configuration sınıfları:

```text
UserConfiguration
RefreshTokenConfiguration
EmployeeConfiguration
AssessmentConfiguration
ActionPlanConfiguration
ActionPlanItemConfiguration
EmployeeTaskConfiguration
ActionCatalogConfiguration
```

Unique constraint'ler:

```text
User.Email
Employee.EmployeeCode
ActionCatalog.Code
RefreshToken.TokenHash
```

Kontrol:

- Foreign key ilişkileri doğru mu?
- Unique constraint'ler eklendi mi?

Ek EF Core kuralları:

```text
Tüm enum alanları HasConversion<string>() ile saklanmalıdır.
Soft delete kullanılan entity sorgularında global query filter veya repository-level filter uygulanmalıdır.
Cascade delete kritik iş tablolarında dikkatli kullanılmalı, mümkünse restrict/no action tercih edilmelidir.
```

---

### Task 14.4 — Migration Oluştur

```bash
dotnet ef migrations add InitialCreate -p BitirmeBackend.Infrastructure -s BitirmeBackend.Api
dotnet ef database update -p BitirmeBackend.Infrastructure -s BitirmeBackend.Api
```

Kontrol:

- Migration dosyası oluştu mu?
- PostgreSQL tabloları oluştu mu?

---

### Task 14.5 — Seed Data Ekle

Seed edilecekler:

```text
Roles, Admin/HR/Manager/Employee users, ModelVersion (LightGBM v1),
Competencies, Departments, JobRoles, ActionCatalog placeholder data,
Demo Employee kaydı (employee@demo.com kullanıcısına bağlı, tüm AI feature alanları dolu)
```

Kritik not:

```text
employee@demo.com kullanıcısına bağlı bir Employee kaydı seed'e dahil edilmelidir.
manager@demo.com kullanıcısına bağlı ayrı bir Employee kaydı seed'e dahil edilmelidir.
Demo employee kaydının ManagerId değeri manager@demo.com kullanıcısına bağlı Employee.Id değerini göstermelidir.
Bu kayıtlar olmadan manager authorization ve demo flow gerçek DB'ye geçişte kırılır.
Employee kaydının tüm AI feature alanları (PerformanceScore, competency skorları dahil) dolu olmalıdır.
```

Kontrol:

- Uygulama ilk açıldığında seed data geliyor mu?

---

### Task 14.6 — Mock Repository'den Gerçek Repository'ye Geç

DI container'da mock yerine gerçek repository register et.

Kontrol:

- Controller kodu değişmeden çalışıyor mu?
- Sadece DI değişikliği yeterli oldu mu?

---

## 19. Faz 15 — Validation ve Güvenlik

### Task 15.1 — Request Validation Ekle

FluentValidation:

```bash
dotnet add BitirmeBackend.Api package FluentValidation.AspNetCore
```

Validasyonlar:

```text
Email format
Required fields
Score range 0-5
Probability range 0-1
DueDate geçmiş tarih olamaz
Empty action plan approve edilemez
Refresh token boş olamaz
pageNumber >= 1 olmalı
pageSize 1 ile 100 arasında olmalı
AI required feature alanları eksiksiz olmalı
```

Kontrol:

- Hatalı request 400 dönüyor mu?
- Boş refresh token ile /auth/refresh 400 dönüyor mu?

---

### Task 15.2 — Authorization Kurallarını Uygula

Kurallar:

```text
Admin: tüm işlemler
HR: employee, assessment, action plan yönetimi
Manager: sadece Employee.ManagerId == kendi EmployeeId olan çalışanları için action plan
Employee: sadece kendi taskları
```

Kontrol:

- Employee başka çalışanın planını göremiyor mu?
- Manager sadece kendi ekibini görebiliyor mu?

---

### Task 15.3 — Sensitive Data Kontrolü

Response içinde dönmemesi gerekenler:

```text
PasswordHash
RefreshToken (login response dışında)
Connection string
Internal stack trace
```

Kontrol:

- Swagger response'larında PasswordHash görünmüyor mu?

---

## 20. Faz 16 — Testler

### Task 16.1 — Test Projesi ve Bağımlılıklar

```bash
dotnet add BitirmeBackend.Tests package Moq
dotnet add BitirmeBackend.Tests package FluentAssertions
```

Kontrol:

```bash
dotnet test
```

---

### Task 16.2 — AuthService Unit Testleri

Test edilecekler:

```text
LoginAsync - doğru credentials -> token dönüyor mu?
LoginAsync - yanlış credentials -> exception/null dönüyor mu?
RefreshTokenAsync - geçerli token -> yeni token dönüyor mu?
RefreshTokenAsync - geçersiz/expire token -> hata dönüyor mu?
RefreshTokenAsync - revoke edilmiş token -> hata dönüyor mu?
```

---

### Task 16.3 — ActionPlanService Unit Testleri

Test edilecekler:

```text
GenerateDraftActionPlanAsync - ML başarılı -> draft plan oluşuyor mu?
GenerateDraftActionPlanAsync - ML 503 -> hata fırlatılıyor mu?
ApproveActionPlanAsync - boş plan -> hata dönüyor mu?
ApproveActionPlanAsync - dolu plan -> Approved oluyor mu?
SendActionPlanToEmployeeAsync - Approved plan -> Sent oluyor ve EmployeeTask'lar oluşuyor mu?
UpdateActionPlanItemAsync - AI item -> Source EditedAI oluyor mu?
GenerateDraftActionPlanAsync - DB yazımı sırasında hata -> transaction rollback yapıyor mu?
GenerateDraftActionPlanAsync - mevcut Draft/Edited/Approved/Sent plan varsa -> duplicate plan üretmiyor mu?
SendActionPlanToEmployeeAsync - iki kez çağrılırsa -> duplicate EmployeeTask oluşmuyor mu?
ApproveActionPlanAsync - zaten Approved/Sent plan -> dokümante edilen davranışı dönüyor mu?
```

---

### Task 16.4 — EmployeeTaskService Unit Testleri

Test edilecekler:

```text
UpdateStatusAsync - Assigned -> InProgress geçiyor mu?
UpdateStatusAsync - InProgress -> Completed geçiyor mu?
UpdateStatusAsync - geçersiz geçiş -> hata dönüyor mu?
UpdateStatusAsync - başka employee'nin taskı -> hata dönüyor mu?
```

---

### Task 16.5 — Fake ML Client Testi

Test edilecekler:

```text
FakeMlPredictionClient 13 aksiyon döndürüyor mu?
FakeMlPredictionClient IsHealthyAsync() true döndürüyor mu?
ML servis mocked 503 iken action plan oluşturma hatası fırlatıyor mu?
```

---

### Task 16.6 — PDF Export Testi

Test edilecekler:

```text
GenerateActionPlanPdfAsync byte[] dönüyor mu?
Donen byte[] boş değil mi?
Geçersiz planId ile çağrıda hata fırlatılıyor mu?
```

---

## 21. Faz 17 — Deployment

### Hedef Mimari

```text
Frontend: Vercel
Backend: Render
ML Service: Render veya Docker container
Database: Cloud PostgreSQL (Render PostgreSQL veya Supabase)
```

### Task 17.1 — Backend Dockerfile Oluştur

Kontrol:

```bash
docker build -t bitirme-backend .
```

---

### Task 17.2 — Local Docker Compose Oluştur

Servisler:

```text
postgres
ml-service
backend-api (depends_on: postgres + ml-service healthcheck)
```

Bağımlılık kuralı:

```text
ML servis PostgreSQL'e bağlı değildir.
Backend API hem PostgreSQL'e hem de ML servisinin sağlıklı olmasına bağlıdır.
Bu nedenle docker-compose içinde depends_on/healthcheck ilişkisi backend-api tarafında kurulmalıdır.
```

ML servis için Docker Compose health check:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
  interval: 10s
  timeout: 5s
  retries: 5
```

Kontrol:

```bash
docker compose up
```

- Backend API, PostgreSQL ve ML servis healthcheck hazır olmadan production benzeri senaryoda trafik almıyor mu?

Demo/Render notu:

```text
Render free tier kullanılırsa backend veya ML servis cold start yaşayabilir.
Sunumdan önce /api/health ve ML /health endpointleri çağrılarak servisler ısıtılmalıdır.
Cloud demo yanında lokal yedek ortam hazır tutulmalıdır.
```

---

### Task 17.3 — Environment Variables Ayarla

Gerekli env'ler:

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection
Jwt__Secret
Jwt__Issuer
Jwt__Audience
Jwt__AccessTokenExpirationMinutes
Jwt__RefreshTokenExpirationDays
MlService__BaseUrl
AllowedOrigins
```

Kontrol:

- Secret bilgiler GitHub'a commit edilmiyor mu?

---

### Task 17.4 — Production CORS Ayarla

Allowed origins: Vercel frontend URL (`AllowedOrigins` env variable'dan okunmalı)

Kontrol:

- Deploy sonrası frontend backend'e erişebiliyor mu?

---

## 22. Faz 18 — Frontend İçin Endpoint Listesi

Frontend ekibiyle paylaşılacak endpointler:

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me

GET  /api/employees?pageNumber=1&pageSize=20
GET  /api/employees/{id}
GET  /api/employees/{id}/features

GET  /api/assessments/{id}
GET  /api/employees/{employeeId}/assessments?pageNumber=1&pageSize=10
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

GET /api/tasks/my?pageNumber=1&pageSize=20
GET /api/tasks/{id}
PUT /api/tasks/{id}/status
```

Kontrol:

- Her endpoint Swagger'da görünüyor mu?
- Request/response örnekleri anlaşılır mı?
- Pagination parametreleri belgelendi mi?

---

## 23. Faz 19 — Demo Senaryosu

### Demo Kullanıcıları

```text
admin@demo.com    / Admin123!
hr@demo.com       / Hr1234!
manager@demo.com  / Manager1!
employee@demo.com / Emp1234!
```

### Demo Akışı

1. HR login olur. (access token + refresh token alır)
2. Employee list sayfasına gider.
3. Demo çalışanı seçer.
4. Assessment detail ekranına girer.
5. Generate AI Action Plan butonuna basar.
6. Sistem 13 AI önerisi getirir.
7. HR bir item düzenler.
8. HR manuel bir item ekler.
9. Plan approve edilir.
10. Plan çalışana gönderilir.
11. Employee login olur.
12. Kendi task listesini görür.
13. Bir task durumunu InProgress yapar.
14. HR action plan PDF indirir.

### Demo Fallback Senaryosu

ML servis down olursa:

1. DI container'da `IMlPredictionClient` implementasyonu yalnızca Development/Demo ortamında `FakeMlPredictionClient` ile değiştirilebilir.
2. 13 hardcoded aksiyon ile demo akışı teknik kesinti durumunda gösterilebilir.
3. Bu durumda kullanılan verinin gerçek ML servis çıktısı değil demo fallback çıktısı olduğu ekip içinde açıkça bilinmelidir.

Kontrol:

- Bu demo 5 dakika içinde sorunsuz gösterilebiliyor mu?
- Cloud çalışmazsa local yedek var mı?
- ML servis down senaryosu için FakeMlPredictionClient hazır mı?

---

## 24. Final Teknik Kontrol Listesi

Backend tamamlandı kabul edilmeden önce aşağıdakiler kontrol edilmelidir:

```text
[ ] dotnet build başarılı
[ ] dotnet test başarılı
[ ] Swagger çalışıyor ve JWT ile test edilebiliyor
[ ] Login çalışıyor (access token + refresh token dönüyor)
[ ] Refresh token endpoint çalışıyor
[ ] Logout refresh token revoke ediyor
[ ] JWT access token çalışıyor
[ ] Role authorization çalışıyor
[ ] Employee liste endpoint pagination çalışıyor
[ ] Employee feature endpoint çalışıyor
[ ] ML servis health check çalışıyor
[ ] ML servis çağrılıyor
[ ] AI 13 aksiyon döndürüyor
[ ] Circuit breaker ML servis down'da devreye giriyor
[ ] Draft action plan oluşuyor
[ ] Action plan item düzenleniyor (EditedAI source oluyor)
[ ] Manual item ekleniyor
[ ] Plan approve ediliyor
[ ] Plan çalışana gönderiliyor
[ ] Employee taskları oluşuyor
[ ] Employee kendi tasklarını görüyor (pagination ile)
[ ] Task status update çalışıyor
[ ] Geçersiz task status geçişi reddediliyor
[ ] PDF export çalışıyor
[ ] Türkçe karakter sorunu yok
[ ] Global exception middleware çalışıyor
[ ] Serilog console'da logları gösteriyor
[ ] PostgreSQL bağlantısı çalışıyor (DB hazır olduğunda)
[ ] Seed data var
[ ] CORS sorunu yok
[ ] Sensitive data response'larda dönmüyor
[ ] Production environment variables hazır
[ ] ASPNETCORE_ENVIRONMENT=Production set edildi
[ ] appsettings.example.json commit'te mevcut
[ ] FakeMlPredictionClient demo fallback olarak hazır
[ ] Enumlar DB'de string olarak saklanıyor
[ ] Soft delete filtreleri uygulanıyor
[ ] Action plan generation transaction içinde çalışıyor
[ ] Send endpoint duplicate EmployeeTask üretmiyor
[ ] Manager sadece kendi ekibine erişebiliyor
[ ] ML feature validation eksik alanları 400 ile yakalıyor
[ ] FakeMlPredictionClient production'da devreye girmiyor
[ ] EmployeeFeatureDto, Employee + Assessment + AssessmentScore/Competency mapping ile üretiliyor
[ ] Refresh token DB'de TokenHash olarak saklanıyor
[ ] ActionPlanItem için ayrı Status alanı kullanılmıyor, soft delete uygulanıyor
[ ] Polly circuit breaker 503 response'ları OrResult ile yakalıyor
[ ] /api/health endpoint çalışıyor
[ ] X-Correlation-Id response header ve loglarda görünüyor
[ ] PDF anlık üretiliyor, DB'de saklanmıyor
```

---

## 25. Önerilen Geliştirme Sırası

Agentic AI araçlarına task verirken aşağıdaki sırayı takip edin:

```text
1.  Solution ve katmanlı yapı (Tests projesi dahil)
2.  Domain entity ve enumlar (RefreshToken dahil)
3.  Contracts DTO'lar (RefreshToken DTO'ları dahil)
4.  Application interface'leri (IRefreshTokenRepository ve IRefreshTokenService dahil)
5.  Mock repository'ler (MockRefreshTokenRepository dahil)
6.  FakeMlPredictionClient
7.  appsettings yapılandırması + appsettings.example.json
8.  Serilog kurulumu
9.  Global exception middleware
10. CorrelationId middleware + backend health endpoint
11. Swagger ve controller iskeletleri
12. JWT auth + Refresh token
13. Employee endpoints (pagination ve feature validation ile)
14. Assessment endpoints (pagination ile)
15. ML service client (Polly circuit breaker ile)
16. Generate action plan endpoint (transaction ve duplicate plan kontrolü ile)
17. Action plan düzenleme endpointleri
18. Employee task endpointleri (pagination ile)
19. PDF export
20. FluentValidation
21. Authorization güçlendirme
22. Unit testler
23. EF Core + PostgreSQL (DB hazır olduğunda)
24. Seed data
25. Docker ve deployment
```

---

## 26. Özel Notlar

### AI Servis Bilgisi

FastAPI ML servisi iki prediction endpoint'i sağlar:

```text
POST http://localhost:8001/predict-actions/top-k?k=13   (kullanılan)
POST http://localhost:8001/predict-actions               (tüm pozitif predictionlar)
GET  http://localhost:8001/health                        (health check)
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

Model yüklü değilse servis `503` döner. Bu durum circuit breaker ile ele alınmalıdır.

Beklenen prediction request formatı:

```json
{
  "employeeId": 101,
  "features": {
    "Age": 32, "Attrition": "No", "BusinessTravel": "Travel_Rarely",
    "Department": "Sales", "DistanceFromHome": 5, "Education": 3,
    "EducationField": "Life Sciences", "EnvironmentSatisfaction": 3,
    "Gender": "Male", "JobRole": "Sales Executive", "JobSatisfaction": 4,
    "MaritalStatus": "Single", "WorkLifeBalance": 3, "TotalWorkingYears": 8,
    "YearsAtCompany": 5, "YearsInCurrentRole": 3, "YearsWithCurrManager": 2,
    "PerformanceScore": 3.5, "Core_Communication": 3.2, "Core_Teamwork": 3.7,
    "Core_ProblemSolving": 3.5, "Core_Adaptability": 3.1, "Core_Initiative": 3.0,
    "Core_Accountability": 3.8, "Core_LearningAgility": 3.4, "Core_TimeManagement": 3.2,
    "Dept_Comp1": 3.5, "Dept_Comp2": 3.0, "Dept_Comp3": 3.6,
    "Role_Comp1": 3.4, "Role_Comp2": 3.1
  }
}
```

Örnek response:

```json
{
  "employeeId": 101,
  "recommendedActions": [
    { "code": "DEPT_COMP1_03", "probability": 0.931633, "selected": true }
  ],
  "totalRecommendedActions": 13
}
```

### AI Önerisi ve Final Task Ayrımı

Bu ayrım bozulmamalıdır:

```text
AI ham önerisi: AiPredictedAction (probability, rank, raw code)
Yetkili tarafından düzenlenen plan item: ActionPlanItem (source: AI/EditedAI/Manual)
Çalışana gönderilen görev: EmployeeTask (status takibi)
```

### Action Catalog Notu

Action catalog DB'de tutulur. İçerikleri DB ekibi tarafından doldurulacaktır. Backend code ile catalog arasında eşleşme yapamadığında fallback title/description üretmelidir.

Kapsam notu:

```text
Demo için en az örnek response içinde dönen 13 action code catalog içinde bulunmalıdır.
Final DB seed aşamasında modelin üretebildiği tüm 47 action label için catalog kaydı oluşturulmalıdır.
```

Fallback kuralı:

```text
Fallback Title: "Gelişim Aksiyonu: {code}"
Fallback Description: "Bu aksiyon için lütfen yöneticinizle iletişime geçin."
Fallback Priority: Medium
```

### Production ve Demo Fallback Notu

```text
FakeMlPredictionClient yalnızca Development/Demo için kullanılmalıdır.
Production ortamında ML servis kullanılamıyorsa backend 503 dönmelidir.
Sunumdan önce cloud servislerin cold start yaşamaması için backend /api/health ve ML /health endpointleri çağrılmalıdır.
```

---

## 27. Agentic AI İçin Prompt Önerisi

```text
You are implementing an ASP.NET Core 9.0 backend for a graduation project.
Use clean architecture with Api, Application, Domain, Infrastructure, Contracts, and Tests projects.
Follow the markdown task list exactly. Implement one phase at a time.
After each phase, run dotnet build and fix all errors.

Key rules:
- Do not skip mock repositories — PostgreSQL is not ready yet.
- Keep controllers thin, business logic in Application services, infrastructure concerns in Infrastructure.
- Implement JWT authentication with refresh token rotation (store refresh tokens in DB).
- Use Serilog for logging (console sink).
- Use Polly circuit breaker (NOT retry) for the FastAPI ML service client.
- All list endpoints must support pagination (pageNumber, pageSize).
- The backend calls FastAPI at /predict-actions/top-k?k=13 and /health.
- If ML service returns 503 or circuit breaker is open, return a clear 503 error to frontend.
- Separate concerns: AiPredictedAction → ActionPlanItem → EmployeeTask.
- Generate EmployeeFeatureDto from Employee + Assessment + AssessmentScore/Competency mapping; do not add all competency scores as Employee columns.
- Store refresh tokens as TokenHash, not raw tokens.
- Catch ML 503 responses in Polly with OrResult, not only exceptions.
- FakeMlPredictionClient is allowed only in Development/Demo, never in Production.
- Never commit secrets; use appsettings.example.json as template.
```
