# Bitirme Projesi — Backend API Dökümanı

> **Base URL:** `https://<host>/api`  
> **Format:** JSON (`Content-Type: application/json`)  
> **Kimlik Doğrulama:** JWT Bearer Token (`Authorization: Bearer <accessToken>`)

---

## İçindekiler

1. [Genel Bilgiler](#1-genel-bilgiler)
2. [Auth — Kimlik Doğrulama](#2-auth--kimlik-doğrulama)
3. [Employees — Çalışanlar](#3-employees--çalışanlar)
4. [Assessments — Değerlendirmeler](#4-assessments--değerlendirmeler)
5. [Action Plans — Aksiyon Planları](#5-action-plans--aksiyon-planları)
6. [Tasks — Görevler](#6-tasks--görevler)
7. [Health — Sistem Durumu](#7-health--sistem-durumu)
8. [Ortak Tipler & Enum Değerleri](#8-ortak-tipler--enum-değerleri)

---

## 1. Genel Bilgiler

### Yanıt Formatı

Tüm başarılı yanıtlar aşağıdaki zarfla döner:

```json
{
  "success": true,
  "message": null,
  "data": { ... }
}
```

Hatalarda:

```json
{
  "success": false,
  "message": "Hata açıklaması"
}
```

### Sayfalanmış Yanıt Formatı

Liste dönen endpoint'ler (sayfalama desteği olanlar):

```json
{
  "success": true,
  "data": [ ... ],
  "totalCount": 42,
  "pageNumber": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

### Yetki Politikaları

| Politika | Kimler Erişir |
|---|---|
| `Authenticated` | Giriş yapmış her kullanıcı |
| `EmployeeOnly` | Sadece `Employee` rolü |
| `HrOrManager` | `HR`, `Manager`, `Admin` rolleri |
| `AdminOnly` | Sadece `Admin` rolü |

> **Manager kısıtlaması:** `HrOrManager` gerektiren endpoint'lerde, `Manager` rolündeki kullanıcılar yalnızca kendi ekiplerindeki çalışanlara erişebilir.

---

## 2. Auth — Kimlik Doğrulama

### POST `/api/auth/login`

Kullanıcı girişi. Token çifti döner.

**Yetki:** Herkese açık

**Request Body:**
```json
{
  "email": "kullanici@ornek.com",
  "password": "Sifre1234!"
}
```

**Response `data`:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "a1b2c3d4...",
  "accessTokenExpiresAt": "2026-06-07T12:00:00Z",
  "userId": 1,
  "fullName": "Ahmet Yılmaz",
  "email": "kullanici@ornek.com",
  "role": "HR",
  "employeeId": 3
}
```

> `employeeId` sadece `Employee`, `Manager` rollerinde dolu gelir; `HR`/`Admin` için `null` olabilir.

---

### POST `/api/auth/refresh`

Access token yenileme.

**Yetki:** Herkese açık

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4..."
}
```

**Response `data`:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "e5f6g7h8...",
  "accessTokenExpiresAt": "2026-06-07T13:00:00Z"
}
```

> Token rotation uygulanır — eski refresh token geçersiz hale gelir, yenisi kullanılmalıdır.

---

### POST `/api/auth/logout`

Çıkış. Refresh token'ı iptal eder.

**Yetki:** `Authenticated`

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4..."
}
```

**Response `data`:** `{}`

---

### GET `/api/auth/me`

Oturum açık kullanıcının bilgilerini döner.

**Yetki:** `Authenticated`

**Response `data`:**
```json
{
  "userId": 1,
  "fullName": "Ahmet Yılmaz",
  "email": "kullanici@ornek.com",
  "role": "HR",
  "employeeId": null
}
```

---

## 3. Employees — Çalışanlar

### GET `/api/employees`

Çalışan listesi (sayfalanmış).

**Yetki:** `HrOrManager`

**Query Params:**

| Parametre | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `pageNumber` | int | 1 | Sayfa numarası (min: 1) |
| `pageSize` | int | 20 | Sayfa boyutu (1–100) |

**Response:** `PagedResponse<EmployeeListItemDto>`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "employeeCode": "EMP001",
      "fullName": "Ahmet Yılmaz",
      "email": "ahmet@ornek.com",
      "department": "Yazılım",
      "jobRole": "Backend Developer",
      "managerId": 5,
      "isActive": true
    }
  ],
  "totalCount": 42,
  "pageNumber": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

---

### GET `/api/employees/{id}`

Tek çalışan detayı.

**Yetki:** `HrOrManager`

**Response `data`:**
```json
{
  "id": 1,
  "employeeCode": "EMP001",
  "fullName": "Ahmet Yılmaz",
  "email": "ahmet@ornek.com",
  "age": 30,
  "gender": "Male",
  "departmentId": 2,
  "department": "Yazılım",
  "jobRoleId": 3,
  "jobRole": "Backend Developer",
  "managerId": 5,
  "managerName": "Zeynep Arslan",
  "education": "3",
  "educationField": "Computer Science",
  "businessTravel": "Travel_Rarely",
  "maritalStatus": "Single",
  "distanceFromHome": 10,
  "environmentSatisfaction": 3,
  "jobSatisfaction": 4,
  "workLifeBalance": 3,
  "totalWorkingYears": 8,
  "yearsAtCompany": 3,
  "yearsInCurrentRole": 2,
  "yearsWithCurrManager": 1,
  "performanceScore": 3.5,
  "attrition": "No",
  "isActive": true
}
```

---

### POST `/api/employees`

Yeni çalışan oluştur.

**Yetki:** `AdminOnly`

**Request Body:**
```json
{
  "employeeCode": "EMP099",
  "fullName": "Ali Demir",
  "email": "ali@ornek.com",
  "age": 28,
  "gender": "Male",
  "departmentId": 2,
  "jobRoleId": 3,
  "managerId": 5,
  "education": "3",
  "educationField": "Computer Science",
  "businessTravel": "Travel_Rarely",
  "maritalStatus": "Single",
  "distanceFromHome": 5,
  "environmentSatisfaction": 3,
  "jobSatisfaction": 4,
  "workLifeBalance": 3,
  "totalWorkingYears": 5,
  "yearsAtCompany": 2,
  "yearsInCurrentRole": 1,
  "yearsWithCurrManager": 1,
  "performanceScore": 3.0,
  "attrition": "No"
}
```

**HTTP 201 Created** — `data`: `EmployeeDetailDto`

---

### PUT `/api/employees/{id}`

Çalışan güncelle.

**Yetki:** `HrOrManager`

**Request Body:** `CreateEmployeeRequest` ile aynı alanlar + `"isActive": true`

**Response `data`:** `EmployeeDetailDto`

---

### GET `/api/employees/{id}/assessments`

Çalışana ait değerlendirme listesi.

**Yetki:** `HrOrManager`

**Query Params:** `pageNumber`, `pageSize`

**Response:** `PagedResponse<AssessmentDetailDto>`

---

### GET `/api/employees/{id}/action-plans`

Çalışana ait tüm aksiyon planları.

**Yetki:** `HrOrManager`

**Response `data`:** `ActionPlanDetailDto[]`

---

### GET `/api/employees/{id}/features?assessmentId={assessmentId}`

Çalışanın ML özellik vektörünü döner. Aksiyon planı oluşturmadan önce doğrulama için kullanılabilir.

**Yetki:** `HrOrManager`

**Query Params:**

| Parametre | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `assessmentId` | int | ✅ | Hangi değerlendirmeye göre hesaplanacağı |

**Başarı Response `data`:**
```json
{
  "age": 30,
  "attrition": "No",
  "businessTravel": "Travel_Rarely",
  "department": "Yazılım",
  "education": "3",
  "educationField": "Computer Science",
  "environmentSatisfaction": 3,
  "gender": "Male",
  "jobRole": "Backend Developer",
  "jobSatisfaction": 4,
  "maritalStatus": "Single",
  "workLifeBalance": 3,
  "totalWorkingYears": 8,
  "yearsAtCompany": 3,
  "yearsInCurrentRole": 2,
  "yearsWithCurrManager": 1,
  "performanceScore": 3.5,
  "core_Communication": 3.8,
  "core_Teamwork": 4.0,
  "core_ProblemSolving": 3.5,
  "core_Adaptability": 3.2,
  "core_Initiative": 3.9,
  "core_Accountability": 4.1,
  "core_LearningAgility": 3.7,
  "core_TimeManagement": 3.6,
  "dept_Comp1": 3.4,
  "dept_Comp2": 3.8,
  "dept_Comp3": 3.5,
  "role_Comp1": 4.0,
  "role_Comp2": 3.9
}
```

**Hata — eksik özellik (HTTP 400):**
```json
{
  "success": false,
  "message": "Eksik özellikler: Core_Communication, Dept_Comp1",
  "missingFeatures": ["Core_Communication", "Dept_Comp1"]
}
```

---

## 4. Assessments — Değerlendirmeler

### GET `/api/assessments/{id}`

Değerlendirme detayı.

**Yetki:** `HrOrManager`

**Response `data`:**
```json
{
  "id": 10,
  "employeeId": 1,
  "employeeName": "Ahmet Yılmaz",
  "cycleId": 2,
  "cycleName": "2025 Q4",
  "overallScore": 3.8,
  "status": "InProgress",
  "createdByUserId": 3,
  "createdByUserName": "İnsan Kaynakları",
  "createdAt": "2026-01-15T09:00:00Z",
  "updatedAt": "2026-01-20T11:30:00Z"
}
```

**`status` değerleri:** `InProgress` | `Completed`

---

### POST `/api/assessments`

Yeni değerlendirme oluştur.

**Yetki:** `HrOrManager`

> Self ataması otomatik eklenir — çalışan kendi değerlendirmesini doldurabilir.

**Request Body:**
```json
{
  "employeeId": 1,
  "cycleId": 2
}
```

**HTTP 201 Created** — `data`: `AssessmentDetailDto`

---

### PUT `/api/assessments/{id}/complete`

Değerlendirmeyi manuel tamamla.

**Yetki:** `HrOrManager`

> Normalde tüm atamalar tamamlandığında otomatik tamamlanır. Bu endpoint zorla tamamlama içindir.

**Response `data`:** `AssessmentDetailDto`

---

### GET `/api/assessments/{id}/scores`

Değerlendirmeye ait tüm skorlar.

**Yetki:** `HrOrManager`

**Response `data`:** `AssessmentScoreDto[]`

```json
[
  {
    "id": 55,
    "assessmentId": 10,
    "competencyId": 1,
    "competencyCode": "Core_Communication",
    "competencyName": "İletişim",
    "evaluatorEmployeeId": 1,
    "evaluatorType": "Self",
    "score": 4.0
  }
]
```

---

### POST `/api/assessments/{id}/scores`

Tek skor ekle / güncelle (upsert).

**Yetki:** `HrOrManager`

**Request Body:**
```json
{
  "competencyId": 1,
  "evaluatorEmployeeId": 1,
  "evaluatorType": "Self",
  "score": 4.0
}
```

**`evaluatorType` değerleri:** `Self` | `Manager` | `Peer` | `Subordinate`

**Response `data`:** `AssessmentScoreDto`

---

### POST `/api/assessments/{id}/scores/bulk`

Bir değerlendiricinin tüm skorlarını tek istekte gönder.

**Yetki:** `Authenticated`

> Çalışanın 360° anket doldurması için kullanılan endpoint.

**Request Body:**
```json
{
  "evaluatorEmployeeId": 4,
  "scores": [
    { "competencyId": 1, "score": 4.0 },
    { "competencyId": 2, "score": 3.5 },
    { "competencyId": 3, "score": 4.5 }
  ]
}
```

> 13 yetkinliğin tamamı gönderildiğinde ilgili atama (`AssessmentAssignment`) otomatik olarak `IsCompleted=true` olur. Tüm atamalar tamamlanınca assessment da otomatik `Completed` olur.

**Response `data`:** `AssessmentScoreDto[]`

---

### PUT `/api/assessments/{id}/scores/{scoreId}`

Var olan skoru güncelle.

**Yetki:** `HrOrManager`

**Request Body:** `UpsertAssessmentScoreRequest` ile aynı

**Not:** `scoreId` rota parametresi yönlendirme içindir; güncelleme `assessmentId + competencyId + evaluatorEmployeeId` üçlüsü ile yapılır.

---

### POST `/api/assessments/{id}/assignments`

360° değerlendirici ata.

**Yetki:** `HrOrManager`

**Request Body:**
```json
{
  "evaluatorEmployeeId": 7,
  "evaluatorType": "Peer"
}
```

> `Self` ve `Manager` her assessment için birden fazla eklenemez.

**Response `data`:** `AssessmentAssignmentDto`

```json
{
  "id": 12,
  "assessmentId": 10,
  "evaluatorEmployeeId": 7,
  "evaluatorEmployeeName": "Mehmet Kaya",
  "evaluatorType": "Peer",
  "isCompleted": false,
  "completedAt": null
}
```

---

### GET `/api/assessments/{id}/assignments`

Değerlendirmeye ait tüm atamaları listele.

**Yetki:** `HrOrManager`

**Response `data`:** `AssessmentAssignmentDto[]`

---

## 5. Action Plans — Aksiyon Planları

### POST `/api/action-plans/generate`

ML servisi aracılığıyla taslak aksiyon planı oluştur.

**Yetki:** `HrOrManager`

**Request Body:**
```json
{
  "assessmentId": 10,
  "topK": 13
}
```

> `topK`: kaç aksiyon önerisi alınacağı (varsayılan 13).  
> ML servisi erişilemez durumdaysa circuit breaker devreye girer ve 503 döner.

**HTTP 201 Created** — `data`: `ActionPlanDetailDto`

```json
{
  "id": 5,
  "assessmentId": 10,
  "employeeId": 1,
  "employeeName": "Ahmet Yılmaz",
  "createdByUserId": 3,
  "createdByUserName": "HR Kullanıcısı",
  "status": "Draft",
  "approvedAt": null,
  "sentAt": null,
  "createdAt": "2026-06-07T10:00:00Z",
  "updatedAt": null,
  "items": [
    {
      "id": 20,
      "actionPlanId": 5,
      "actionCatalogId": "COMM_001",
      "aiPredictedActionId": 101,
      "title": "Sunum Teknikleri Eğitimi",
      "description": "Etkili iletişim için sunum becerilerini geliştir.",
      "resource": "Coursera",
      "deliveryType": "Online",
      "priority": "High",
      "dueDate": null,
      "source": "AI",
      "orderNo": 1,
      "taskStatus": null
    }
  ]
}
```

**`status` değerleri:** `Draft` | `Approved` | `Sent` | `Cancelled`

**`source` değerleri:** `AI` | `Manual`

**`priority` değerleri:** `Low` | `Medium` | `High`

---

### GET `/api/action-plans/{id}`

Aksiyon planı detayı.

**Yetki:** `HrOrManager`

**Response `data`:** `ActionPlanDetailDto`

---

### PUT `/api/action-plans/{id}/items/{itemId}`

Plan maddesini düzenle.

**Yetki:** `HrOrManager`

**Request Body:**
```json
{
  "title": "Güncellenmiş Başlık",
  "description": "Güncellenmiş açıklama.",
  "priority": "High",
  "dueDate": "2026-09-01T00:00:00Z",
  "orderNo": 2
}
```

**Response `data`:** `ActionPlanDetailDto`

---

### POST `/api/action-plans/{id}/items`

Plana manuel madde ekle.

**Yetki:** `HrOrManager`

**Request Body:**
```json
{
  "title": "Mentorluk Programı",
  "description": "Kıdemli bir meslektaşla düzenli görüşmeler.",
  "priority": "Medium",
  "dueDate": "2026-12-01T00:00:00Z",
  "actionCatalogId": null
}
```

**Response `data`:** `ActionPlanDetailDto`

---

### DELETE `/api/action-plans/{id}/items/{itemId}`

Plan maddesini sil (soft delete).

**Yetki:** `HrOrManager`

**HTTP 204 No Content**

---

### POST `/api/action-plans/{id}/approve`

Aksiyon planını onayla (`Draft` → `Approved`).

**Yetki:** `HrOrManager`

**Response `data`:** `ActionPlanDetailDto`

---

### POST `/api/action-plans/{id}/send`

Onaylı planı çalışana gönder (`Approved` → `Sent`). Her plan maddesi için `EmployeeTask` oluşturur.

**Yetki:** `HrOrManager`

> İdempotent: aynı plan ikinci kez gönderilirse duplicate görev oluşturmaz.

**Response `data`:** `ActionPlanDetailDto`

---

### POST `/api/action-plans/{id}/cancel`

Aksiyon planını iptal et (`Draft`/`Approved` → `Cancelled`).

**Yetki:** `HrOrManager`

**Response `data`:** `ActionPlanDetailDto`

---

### GET `/api/action-plans/{id}/export-pdf`

Aksiyon planını PDF olarak indir.

**Yetki:** `HrOrManager`

**Response:** `application/pdf` — dosya adı `aksiyon-plani-{id}.pdf`

> PDF her istekte anlık üretilir; sunucuda saklanmaz.

---

## 6. Tasks — Görevler

### GET `/api/tasks/my`

Giriş yapan çalışanın görev listesi (sayfalanmış).

**Yetki:** `Authenticated` (çalışan kaydı olan kullanıcılar)

**Query Params:** `pageNumber`, `pageSize`

**Response:** `PagedResponse<EmployeeTaskDto>`

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "actionPlanItemId": 20,
      "title": "Sunum Teknikleri Eğitimi",
      "description": "Etkili iletişim için sunum becerilerini geliştir.",
      "priority": "High",
      "employeeId": 1,
      "employeeName": "Ahmet Yılmaz",
      "assignedByUserId": 3,
      "assignedByUserName": "HR Kullanıcısı",
      "status": "Pending",
      "assignedAt": "2026-06-07T10:30:00Z",
      "dueDate": null,
      "completedAt": null
    }
  ],
  "totalCount": 5,
  "pageNumber": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

**`status` değerleri:** `Pending` | `InProgress` | `Completed` | `Cancelled`

---

### GET `/api/tasks/my-surveys`

Giriş yapan çalışanın doldurması gereken bekleyen 360° anketleri listeler.

**Yetki:** `Authenticated` (çalışan kaydı olan kullanıcılar)

**Response `data`:** `MySurveyDto[]`

```json
[
  {
    "assignmentId": 12,
    "assessmentId": 10,
    "employeeId": 1,
    "employeeName": "Ahmet Yılmaz",
    "cycleId": 2,
    "cycleName": "2025 Q4",
    "evaluatorType": "Peer",
    "competencyCount": 13
  }
]
```

> Bu listedeki her anket için `POST /api/assessments/{assessmentId}/scores/bulk` çağrısı yapılmalıdır.

---

### GET `/api/tasks/{id}`

Görev detayı.

**Yetki:** `Authenticated`

> `Employee` rolü sadece kendi görevlerini görebilir.

**Response `data`:** `EmployeeTaskDto`

---

### PUT `/api/tasks/{id}/status`

Görev durumunu güncelle. Sadece görevin sahibi çalışan yapabilir.

**Yetki:** `EmployeeOnly`

**Request Body:**
```json
{
  "newStatus": "InProgress"
}
```

**`newStatus` değerleri:** `Pending` | `InProgress` | `Completed` | `Cancelled`

**Response `data`:** `EmployeeTaskDto`

---

## 7. Health — Sistem Durumu

### GET `/api/health`

**Yetki:** Herkese açık

**Response:**
```json
{
  "status": "Healthy",
  "timestamp": "2026-06-07T10:00:00Z"
}
```

---

## 8. Ortak Tipler & Enum Değerleri

### Roller

| Değer | Açıklama |
|---|---|
| `Admin` | Tam yetki |
| `HR` | İK — çalışan/değerlendirme/plan yönetimi |
| `Manager` | Kendi ekibine kapsamlı erişim |
| `Employee` | Sadece kendi görev/anketi |

### EvaluatorType (360° Değerlendirici Türü)

| Değer | Açıklama |
|---|---|
| `Self` | Kişinin kendisi |
| `Manager` | Yönetici |
| `Peer` | Akran / meslektaş |
| `Subordinate` | Ast |

### AssessmentStatus

| Değer | Açıklama |
|---|---|
| `InProgress` | Devam ediyor |
| `Completed` | Tamamlandı |

### ActionPlanStatus

| Değer | Açıklama |
|---|---|
| `Draft` | Taslak — düzenlenebilir |
| `Approved` | Onaylandı — gönderilebilir |
| `Sent` | Çalışana gönderildi |
| `Cancelled` | İptal edildi |

### EmployeeTaskStatus

| Değer | Açıklama |
|---|---|
| `Pending` | Bekliyor |
| `InProgress` | Devam ediyor |
| `Completed` | Tamamlandı |
| `Cancelled` | İptal edildi |

### Priority

| Değer | Açıklama |
|---|---|
| `Low` | Düşük |
| `Medium` | Orta |
| `High` | Yüksek |

---

## Örnek Akış: Tam Kullanım Senaryosu

```
1. POST /api/auth/login               → accessToken, refreshToken al
2. GET  /api/employees                → çalışan listesini getir
3. POST /api/assessments              → yeni değerlendirme oluştur (Self ataması otomatik)
4. POST /api/assessments/{id}/assignments   → Peer/Manager ata
5. POST /api/assessments/{id}/scores/bulk  → skorları gir (Self veya başka evaluator)
6. GET  /api/employees/{id}/features?assessmentId=...  → ML özellik vektörünü doğrula
7. POST /api/action-plans/generate    → ML ile taslak plan oluştur
8. PUT  /api/action-plans/{id}/items/{itemId}  → gerekirse maddeleri düzenle
9. POST /api/action-plans/{id}/approve → planı onayla
10. POST /api/action-plans/{id}/send  → çalışana gönder (görevler oluşur)
11. GET  /api/tasks/my                → çalışan kendi görevlerini görür
12. PUT  /api/tasks/{id}/status       → çalışan görev durumunu günceller
13. GET  /api/action-plans/{id}/export-pdf  → PDF raporu indir
```

---

## Demo Hesapları

| Email | Şifre | Rol | Not |
|---|---|---|---|
| `zeynep.arslan@demo.com` | `Employee1234!` | Employee | EmployeeId=4, bekleyen Peer anketi mevcut |

> Diğer demo hesapları için backend ekibine danışın.

---

*Son güncelleme: 2026-06-07*
