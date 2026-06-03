# Bitirme Backend — API Dokümantasyonu

> Frontend geliştiricileri için kapsamlı entegrasyon rehberi.  
> Son güncelleme: 2026-05-30

---

## İçindekiler

1. [Genel Bilgiler](#1-genel-bilgiler)
2. [Authentication](#2-authentication)
3. [Kullanıcı Rolleri ve Yetki Tablosu](#3-kullanıcı-rolleri-ve-yetki-tablosu)
4. [Employee Endpointleri](#4-employee-endpointleri)
5. [Assessment Endpointleri](#5-assessment-endpointleri)
6. [Action Plan Endpointleri](#6-action-plan-endpointleri)
7. [Employee Task Endpointleri](#7-employee-task-endpointleri)
8. [Health Endpoint](#8-health-endpoint)
9. [Hata Yönetimi](#9-hata-yönetimi)
10. [Demo Kullanıcıları](#10-demo-kullanıcıları)
11. [Tipik Frontend Akışları](#11-tipik-frontend-akışları)
12. [Pagination](#12-pagination)

---

## 1. Genel Bilgiler

### Base URL

| Ortam | URL |
|-------|-----|
| Development | `http://localhost:5100` |
| Frontend (CORS) | `http://localhost:3000` |

### Ortak Kurallar

- Tüm istek ve yanıtlar `Content-Type: application/json` kullanır.
- Korumalı endpointler `Authorization: Bearer {accessToken}` header'ı gerektirir.
- Tarih/saat alanları ISO 8601 UTC formatındadır: `"2024-10-15T08:30:00Z"`

---

### ApiResponse Şeması

Tekil veri döndüren tüm endpointler bu formatı kullanır:

```json
{
  "success": true,
  "message": null,
  "data": { ... }
}
```

Hata durumunda:

```json
{
  "success": false,
  "message": "Hata açıklaması",
  "data": null
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `success` | boolean | İşlemin başarılı olup olmadığı |
| `message` | string \| null | Bilgi veya hata mesajı |
| `data` | object \| null | Yanıt verisi |

---

### PagedResponse Şeması

Listeleme endpointleri bu formatı kullanır:

```json
{
  "success": true,
  "data": [ ... ],
  "totalCount": 50,
  "pageNumber": 1,
  "pageSize": 20,
  "totalPages": 3
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `success` | boolean | Her zaman `true` |
| `data` | array | Sayfalanmış veri listesi |
| `totalCount` | integer | Toplam kayıt sayısı |
| `pageNumber` | integer | Mevcut sayfa (1'den başlar) |
| `pageSize` | integer | Sayfa başına kayıt sayısı |
| `totalPages` | integer | Toplam sayfa sayısı (hesaplanan) |

---

## 2. Authentication

JWT Bearer Token kullanılır. Access token süresi **60 dakikadır**. Refresh token süresi **7 gündür**.

### Token Kullanımı

Tüm korumalı isteklerde aşağıdaki header eklenmelidir:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### POST /api/auth/login

Kullanıcı girişi yapar ve token çifti döndürür.

**Yetki:** Herkese açık (anonim)

**Request Body:**

```json
{
  "email": "hr@demo.com",
  "password": "Hr1234!"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `email` | string | ✅ | Kullanıcı e-posta adresi |
| `password` | string | ✅ | Kullanıcı şifresi |

**Response (200 OK):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "d4f8a2b1c9e7...",
    "accessTokenExpiresAt": "2024-10-15T09:30:00Z",
    "userId": 2,
    "fullName": "HR User",
    "email": "hr@demo.com",
    "role": "HR",
    "employeeId": null
  }
}
```

| Alan | Açıklama |
|------|----------|
| `accessToken` | Korumalı endpointlerde kullanılan JWT token |
| `refreshToken` | Token yenilemede kullanılan opak token |
| `accessTokenExpiresAt` | Access token'ın sona ereceği UTC zaman |
| `userId` | Kullanıcının sistem ID'si |
| `role` | `Admin`, `HR`, `Manager`, `Employee` |
| `employeeId` | Çalışan rolü için bağlı Employee ID'si; Admin ve HR için `null` |

---

### POST /api/auth/refresh

Süresi dolmuş (veya dolmak üzere olan) access token'ı yenilemek için kullanılır.

**Yetki:** Herkese açık (anonim)

**Request Body:**

```json
{
  "refreshToken": "d4f8a2b1c9e7..."
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `refreshToken` | string | ✅ | Daha önce login/refresh'ten alınan refresh token |

**Response (200 OK):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "e5g9c3d2a8f1...",
    "accessTokenExpiresAt": "2024-10-15T10:30:00Z"
  }
}
```

> **Önemli:** Her refresh işleminde eski refresh token geçersiz hale gelir ve yeni bir refresh token döner (token rotation). Yeni refresh token'ı saklayın.

---

### POST /api/auth/logout

Kullanıcı oturumu kapatır ve refresh token'ı iptal eder.

**Yetki:** Giriş yapmış tüm kullanıcılar

**Request Body:**

```json
{
  "refreshToken": "d4f8a2b1c9e7..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Çıkış başarılı.",
  "data": {}
}
```

---

### GET /api/auth/me

Giriş yapmış kullanıcının bilgilerini döndürür.

**Yetki:** Giriş yapmış tüm kullanıcılar

**Request Body:** Yok

**Response (200 OK):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "userId": 2,
    "fullName": "HR User",
    "email": "hr@demo.com",
    "role": "HR",
    "employeeId": null,
    "isActive": true
  }
}
```

---

## 3. Kullanıcı Rolleri ve Yetki Tablosu

Sistemde 4 rol mevcuttur:

| Rol | Açıklama |
|-----|----------|
| `Admin` | Tam sistem erişimi |
| `HR` | İK yönetimi, tüm çalışanlara erişim |
| `Manager` | Ekip yönetimi, **sadece kendi ekibini** görebilir |
| `Employee` | Standart çalışan erişimi, sadece kendi görevleri |

### Endpoint Yetki Tablosu

| Endpoint | Admin | HR | Manager | Employee |
|----------|-------|----|---------|----------|
| POST /api/auth/login | ✅ | ✅ | ✅ | ✅ |
| POST /api/auth/refresh | ✅ | ✅ | ✅ | ✅ |
| POST /api/auth/logout | ✅ | ✅ | ✅ | ✅ |
| GET /api/auth/me | ✅ | ✅ | ✅ | ✅ |
| GET /api/employees | ❌ | ✅ | ✅ * | ❌ |
| GET /api/employees/{id} | ❌ | ✅ | ✅ * | ❌ |
| POST /api/employees | ✅ | ❌ | ❌ | ❌ |
| PUT /api/employees/{id} | ❌ | ✅ | ✅ | ❌ |
| GET /api/employees/{id}/features | ❌ | ✅ | ✅ * | ❌ |
| GET /api/employees/{id}/assessments | ❌ | ✅ | ✅ * | ❌ |
| GET /api/employees/{id}/action-plans | ❌ | ✅ | ✅ * | ❌ |
| GET /api/assessments/{id} | ❌ | ✅ | ✅ | ❌ |
| POST /api/assessments | ❌ | ✅ | ✅ | ❌ |
| PUT /api/assessments/{id}/complete | ❌ | ✅ | ✅ | ❌ |
| GET /api/assessments/{id}/scores | ❌ | ✅ | ✅ | ❌ |
| POST /api/assessments/{id}/scores | ❌ | ✅ | ✅ | ❌ |
| PUT /api/assessments/{id}/scores/{scoreId} | ❌ | ✅ | ✅ | ❌ |
| POST /api/action-plans/generate | ❌ | ✅ | ✅ | ❌ |
| GET /api/action-plans/{id} | ❌ | ✅ | ✅ | ❌ |
| PUT /api/action-plans/{id}/items/{itemId} | ❌ | ✅ | ✅ | ❌ |
| POST /api/action-plans/{id}/items | ❌ | ✅ | ✅ | ❌ |
| DELETE /api/action-plans/{id}/items/{itemId} | ❌ | ✅ | ✅ | ❌ |
| POST /api/action-plans/{id}/approve | ❌ | ✅ | ✅ | ❌ |
| POST /api/action-plans/{id}/send | ❌ | ✅ | ✅ | ❌ |
| GET /api/action-plans/{id}/export-pdf | ❌ | ✅ | ✅ | ❌ |
| GET /api/tasks/my | ✅ | ✅ | ✅ | ✅ |
| GET /api/tasks/{id} | ✅ | ✅ | ✅ | ✅ ** |
| PUT /api/tasks/{id}/status | ❌ | ❌ | ❌ | ✅ |
| GET /api/health | ✅ | ✅ | ✅ | ✅ |

> **\*** Manager kısıtı: Yalnızca kendi ekibindeki çalışanları (ManagerId == kendi EmployeeId'si) görebilir.  
> **\*\*** Employee kısıtı: Yalnızca kendi görevine erişebilir.

---

## 4. Employee Endpointleri

### GET /api/employees

Çalışan listesini sayfalı döndürür.

**Yetki:** HR, Manager (Manager kendi ekibini görür)

**Query Parameters:**

| Parametre | Tip | Varsayılan | Açıklama |
|-----------|-----|-----------|----------|
| `pageNumber` | integer | 1 | Sayfa numarası (min: 1) |
| `pageSize` | integer | 20 | Sayfa boyutu (1-100) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "employeeCode": "EMP001",
      "fullName": "Ayşe Kaya",
      "email": "employee@demo.com",
      "department": "Sales",
      "jobRole": "Sales Executive",
      "managerId": 2,
      "isActive": true
    }
  ],
  "totalCount": 3,
  "pageNumber": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### GET /api/employees/{id}

Belirtilen çalışanın detaylı bilgilerini döndürür.

**Yetki:** HR, Manager (kendi ekibindeki çalışan)

**Path Parameters:** `id` — Çalışan ID'si

**Response (200 OK):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "id": 1,
    "employeeCode": "EMP001",
    "fullName": "Ayşe Kaya",
    "email": "employee@demo.com",
    "age": 32,
    "gender": "Female",
    "departmentId": 1,
    "department": "Sales",
    "jobRoleId": 1,
    "jobRole": "Sales Executive",
    "managerId": 2,
    "managerName": "Mehmet Yılmaz",
    "education": "3",
    "educationField": "Life Sciences",
    "businessTravel": "Travel_Rarely",
    "maritalStatus": "Single",
    "distanceFromHome": 5,
    "environmentSatisfaction": 3,
    "jobSatisfaction": 4,
    "workLifeBalance": 3,
    "totalWorkingYears": 8,
    "yearsAtCompany": 5,
    "yearsInCurrentRole": 3,
    "yearsWithCurrManager": 2,
    "performanceScore": 3.5,
    "attrition": "No",
    "isActive": true
  }
}
```

---

### POST /api/employees

Yeni çalışan oluşturur.

**Yetki:** Yalnızca Admin

**Request Body:**

```json
{
  "employeeCode": "EMP010",
  "fullName": "Fatma Çelik",
  "email": "fatma.celik@sirket.com",
  "age": 29,
  "gender": "Female",
  "departmentId": 2,
  "jobRoleId": 3,
  "managerId": 2,
  "education": "4",
  "educationField": "Computer Science",
  "businessTravel": "Travel_Rarely",
  "maritalStatus": "Single",
  "distanceFromHome": 8,
  "environmentSatisfaction": 4,
  "jobSatisfaction": 4,
  "workLifeBalance": 3,
  "totalWorkingYears": 5,
  "yearsAtCompany": 2,
  "yearsInCurrentRole": 1,
  "yearsWithCurrManager": 1,
  "performanceScore": 3.8,
  "attrition": "No"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `employeeCode` | string | ✅ | Benzersiz çalışan kodu |
| `fullName` | string | ✅ | Ad soyad |
| `email` | string | ✅ | E-posta |
| `age` | integer | ✅ | Yaş |
| `gender` | string | ✅ | `Male` veya `Female` |
| `departmentId` | integer | ✅ | Departman ID'si |
| `jobRoleId` | integer | ✅ | Pozisyon ID'si |
| `managerId` | integer | ❌ | Yönetici Employee ID'si |
| `education` | string | ✅ | Eğitim seviyesi (1-5) |
| `educationField` | string | ✅ | Eğitim alanı |
| `businessTravel` | string | ✅ | `Non-Travel`, `Travel_Rarely`, `Travel_Frequently` |
| `maritalStatus` | string | ✅ | `Single`, `Married`, `Divorced` |
| `distanceFromHome` | integer | ✅ | Eve uzaklık (km) |
| `environmentSatisfaction` | integer | ✅ | 1-4 arası |
| `jobSatisfaction` | integer | ✅ | 1-4 arası |
| `workLifeBalance` | integer | ✅ | 1-4 arası |
| `totalWorkingYears` | integer | ✅ | Toplam çalışma yılı |
| `yearsAtCompany` | integer | ✅ | Şirketteki yıl |
| `yearsInCurrentRole` | integer | ✅ | Mevcut roldeki yıl |
| `yearsWithCurrManager` | integer | ✅ | Mevcut yöneticiyle yıl |
| `performanceScore` | double | ✅ | Performans skoru |
| `attrition` | string | ❌ | `Yes` veya `No` (varsayılan: `No`) |

**Response (201 Created):** `EmployeeDetailDto` — aynı format GET /{id} ile aynı

---

### PUT /api/employees/{id}

Çalışan bilgilerini günceller.

**Yetki:** HR, Manager

**Path Parameters:** `id` — Çalışan ID'si

**Request Body:** POST ile aynı alanlar, ancak `employeeCode` yok ve `isActive` eklendi:

```json
{
  "fullName": "Ayşe Kaya",
  "email": "ayse.kaya@sirket.com",
  "age": 33,
  "gender": "Female",
  "departmentId": 1,
  "jobRoleId": 1,
  "managerId": 2,
  "education": "3",
  "educationField": "Life Sciences",
  "businessTravel": "Travel_Rarely",
  "maritalStatus": "Married",
  "distanceFromHome": 5,
  "environmentSatisfaction": 3,
  "jobSatisfaction": 4,
  "workLifeBalance": 3,
  "totalWorkingYears": 9,
  "yearsAtCompany": 6,
  "yearsInCurrentRole": 4,
  "yearsWithCurrManager": 3,
  "performanceScore": 3.7,
  "attrition": "No",
  "isActive": true
}
```

**Response (200 OK):** Güncellenmiş `EmployeeDetailDto`

---

### GET /api/employees/{id}/features

Çalışanın belirtilen değerlendirmesindeki ML feature vektörünü döndürür. Aksiyon planı oluşturmadan önce ön kontrol için kullanılabilir.

**Yetki:** HR, Manager

**Path Parameters:** `id` — Çalışan ID'si

**Query Parameters:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| `assessmentId` | integer | ✅ | Değerlendirme ID'si |

**Response (200 OK):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "age": 32,
    "attrition": "No",
    "businessTravel": "Travel_Rarely",
    "department": "Sales",
    "distanceFromHome": 5,
    "education": "3",
    "educationField": "Life Sciences",
    "environmentSatisfaction": 3,
    "gender": "Female",
    "jobRole": "Sales Executive",
    "jobSatisfaction": 4,
    "maritalStatus": "Single",
    "workLifeBalance": 3,
    "totalWorkingYears": 8,
    "yearsAtCompany": 5,
    "yearsInCurrentRole": 3,
    "yearsWithCurrManager": 2,
    "performanceScore": 3.5,
    "core_Communication": 3.2,
    "core_Teamwork": 3.7,
    "core_ProblemSolving": 3.5,
    "core_Adaptability": 3.1,
    "core_Initiative": 3.0,
    "core_Accountability": 3.8,
    "core_LearningAgility": 3.4,
    "core_TimeManagement": 2.9,
    "dept_Comp1": 3.5,
    "dept_Comp2": 3.0,
    "dept_Comp3": 3.6,
    "role_Comp1": 3.4,
    "role_Comp2": 3.1
  }
}
```

**Hata (400 Bad Request) — eksik feature:**

```json
{
  "success": false,
  "message": "Eksik özellikler: Core_Communication, Dept_Comp1",
  "missingFeatures": ["Core_Communication", "Dept_Comp1"]
}
```

> Eksik feature varsa ML servisine gidilmez; önce tüm competency skorları girilmelidir.

---

### GET /api/employees/{id}/assessments

Çalışanın değerlendirme geçmişini sayfalı döndürür.

**Yetki:** HR, Manager

**Query Parameters:** `pageNumber`, `pageSize` (pagination bkz. Bölüm 12)

**Response (200 OK):** `PagedResponse<AssessmentDetailDto>` — bkz. Assessment Endpointleri

---

### GET /api/employees/{id}/action-plans

Çalışanın tüm aksiyon planlarını listeler.

**Yetki:** HR, Manager

**Response (200 OK):**

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 1,
      "assessmentId": 1,
      "employeeId": 1,
      "employeeName": "Ayşe Kaya",
      "createdByUserId": 2,
      "createdByUserName": "HR User",
      "status": "Sent",
      "approvedAt": "2024-10-16T10:00:00Z",
      "sentAt": "2024-10-16T11:00:00Z",
      "createdAt": "2024-10-15T09:00:00Z",
      "updatedAt": "2024-10-16T11:00:00Z",
      "items": [ ... ]
    }
  ]
}
```

---

## 5. Assessment Endpointleri

### POST /api/assessments

Yeni değerlendirme oluşturur.

**Yetki:** HR, Manager

**Request Body:**

```json
{
  "employeeId": 1,
  "cycleId": 1
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `employeeId` | integer | ✅ | Değerlendirilecek çalışan ID'si |
| `cycleId` | integer | ✅ | Değerlendirme dönemi ID'si |

**Response (201 Created):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "id": 2,
    "employeeId": 1,
    "employeeName": "Ayşe Kaya",
    "cycleId": 1,
    "cycleName": "2024 Q4 Değerlendirmesi",
    "overallScore": null,
    "status": "Draft",
    "createdByUserId": 2,
    "createdByUserName": "HR User",
    "createdAt": "2024-10-15T08:30:00Z",
    "updatedAt": null
  }
}
```

**Assessment Status Değerleri:**

| Değer | Açıklama |
|-------|----------|
| `Draft` | Oluşturuldu, skorlar girilmedi |
| `Completed` | Tüm skorlar girildi ve tamamlandı |
| `Analyzed` | ML analizi yapıldı |
| `ActionPlanGenerated` | Aksiyon planı oluşturuldu |
| `Approved` | Aksiyon planı onaylandı |
| `SentToEmployee` | Çalışana gönderildi |

---

### GET /api/assessments/{id}

Değerlendirme detayını döndürür.

**Yetki:** HR, Manager

**Response (200 OK):** `AssessmentDetailDto` — POST ile aynı format

---

### PUT /api/assessments/{id}/complete

Değerlendirmeyi tamamlandı olarak işaretler. Tüm competency skorları girilmiş olmalıdır.

**Yetki:** HR, Manager

**Request Body:** Yok

**Response (200 OK):** Güncellenmiş `AssessmentDetailDto`

---

### GET /api/assessments/{id}/scores

Değerlendirmenin tüm competency skorlarını listeler.

**Yetki:** HR, Manager

**Response (200 OK):**

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 1,
      "assessmentId": 1,
      "competencyId": 1,
      "competencyCode": "Core_Communication",
      "competencyName": "İletişim",
      "evaluatorType": "Manager",
      "score": 3.2
    }
  ]
}
```

---

### POST /api/assessments/{id}/scores

Değerlendirmeye competency skoru ekler veya günceller (upsert).

**Yetki:** HR, Manager

**Request Body:**

```json
{
  "competencyId": 1,
  "evaluatorType": "Manager",
  "score": 3.5
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `competencyId` | integer | ✅ | Yetkinlik ID'si |
| `evaluatorType` | string | ✅ | `Self`, `Manager`, `Peer`, `Subordinate` |
| `score` | double | ✅ | 0.0 ile 5.0 arasında |

**Response (200 OK):** Eklenen/güncellenen `AssessmentScoreDto`

---

### PUT /api/assessments/{id}/scores/{scoreId}

Mevcut bir skoru günceller (scoreId URL'de routing amaçlı, asıl eşleştirme assessmentId + competencyId + evaluatorType üzerinden yapılır).

**Yetki:** HR, Manager

**Request Body:** POST ile aynı

**Validation:** Skor 0.0–5.0 aralığı dışındaysa 400 Bad Request döner.

**Response (200 OK):** Güncellenmiş `AssessmentScoreDto`

---

## 6. Action Plan Endpointleri

### Aksiyon Planı Yaşam Döngüsü

```
Assessment (Completed)
       ↓
POST /generate        → Draft
       ↓
PUT /items/{itemId}   → Edited (düzenleme)
POST /items           → Edited (manuel ekle)
DELETE /items/{id}    → Edited (sil)
       ↓
POST /approve         → Approved
       ↓
POST /send            → Sent   (Employee görevleri oluşturulur)
       ↓
GET /export-pdf       → PDF indir
```

---

### POST /api/action-plans/generate

ML servisi kullanarak taslak aksiyon planı oluşturur. Değerlendirme `Completed` veya daha ileri bir statüde olmalıdır.

**Yetki:** HR, Manager

**Request Body:**

```json
{
  "assessmentId": 1,
  "topK": 13
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `assessmentId` | integer | ✅ | Tamamlanmış değerlendirme ID'si |
| `topK` | integer | ❌ | Önerilen aksiyon sayısı (varsayılan: 13) |

**Response (201 Created):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "actionPlanId": 1,
    "status": "Draft",
    "itemCount": 13,
    "createdAt": "2024-10-15T09:00:00Z"
  }
}
```

**Olası Hatalar:**
- `503 Service Unavailable` — ML servisi erişilemiyor (circuit breaker açık)
- `400 Bad Request` — Feature eksik (missingFeatures listesi döner)

---

### GET /api/action-plans/{id}

Aksiyon planı detayını tüm kalemlerle birlikte döndürür.

**Yetki:** HR, Manager

**Response (200 OK):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "id": 1,
    "assessmentId": 1,
    "employeeId": 1,
    "employeeName": "Ayşe Kaya",
    "createdByUserId": 2,
    "createdByUserName": "HR User",
    "status": "Draft",
    "approvedAt": null,
    "sentAt": null,
    "createdAt": "2024-10-15T09:00:00Z",
    "updatedAt": null,
    "items": [
      {
        "id": 1,
        "actionPlanId": 1,
        "actionCatalogId": 1,
        "aiPredictedActionId": 1,
        "title": "Departman Yetkinliği 1 Geliştirme Planı",
        "description": "Departmana özgü birincil yetkinliği orta seviyeye taşımak için yapılandırılmış öğrenme programına katılım.",
        "priority": "High",
        "dueDate": null,
        "source": "AI",
        "orderNo": 1
      }
    ]
  }
}
```

**ActionPlanItem `priority` değerleri:** `Low`, `Medium`, `High`

**ActionPlanItem `source` değerleri:** `AI` (ML önerisi) veya `Manual` (manuel eklendi)

**ActionPlan `status` değerleri:**

| Değer | Açıklama |
|-------|----------|
| `Draft` | Oluşturuldu, düzenleme bekliyor |
| `Edited` | En az bir değişiklik yapıldı |
| `Approved` | Onaylandı |
| `Sent` | Çalışana gönderildi, görevler oluşturuldu |
| `Completed` | Tamamlandı |
| `Cancelled` | İptal edildi |

---

### PUT /api/action-plans/{id}/items/{itemId}

Var olan bir aksiyon planı kalemini günceller.

**Yetki:** HR, Manager

**Request Body:**

```json
{
  "title": "Güncellenmiş Başlık",
  "description": "Güncellenmiş açıklama.",
  "priority": "High",
  "dueDate": "2024-12-31T00:00:00Z",
  "orderNo": 1
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `title` | string | ✅ | Kalem başlığı |
| `description` | string | ✅ | Kalem açıklaması |
| `priority` | string | ✅ | `Low`, `Medium`, `High` |
| `dueDate` | datetime | ❌ | Tamamlanma tarihi (ISO 8601) |
| `orderNo` | integer | ✅ | Sıralama numarası |

**Response (200 OK):** Güncellenmiş `ActionPlanItemDto`

---

### POST /api/action-plans/{id}/items

Aksiyon planına manuel kalem ekler.

**Yetki:** HR, Manager

**Request Body:**

```json
{
  "title": "Manuel Eğitim",
  "description": "Şirket içi eğitime katılım.",
  "priority": "Medium",
  "dueDate": "2024-12-15T00:00:00Z",
  "actionCatalogId": null
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `title` | string | ✅ | Kalem başlığı |
| `description` | string | ✅ | Kalem açıklaması |
| `priority` | string | ❌ | `Low`, `Medium`, `High` (varsayılan: `Medium`) |
| `dueDate` | datetime | ❌ | Tamamlanma tarihi |
| `actionCatalogId` | integer | ❌ | Katalogdan seçilmişse katalog ID'si |

**Response (200 OK):** Eklenen `ActionPlanItemDto`

---

### DELETE /api/action-plans/{id}/items/{itemId}

Aksiyon planından kalem kaldırır (soft delete).

**Yetki:** HR, Manager

**Response:** `204 No Content`

---

### POST /api/action-plans/{id}/approve

Aksiyon planını onaylar. Plan `Draft` veya `Edited` statüsünde olmalıdır.

**Yetki:** HR, Manager

**Request Body:** Yok

**Response (200 OK):** Güncellenmiş `ActionPlanDetailDto` (status: `Approved`)

---

### POST /api/action-plans/{id}/send

Aksiyon planını çalışana gönderir; plan kalemleri EmployeeTask olarak oluşturulur.

**Yetki:** HR, Manager

**Request Body:** Yok

> **Idempotent:** Aynı plan birden fazla gönderilirse mükerrer görev oluşturulmaz.

**Response (200 OK):** Güncellenmiş `ActionPlanDetailDto` (status: `Sent`)

---

### GET /api/action-plans/{id}/export-pdf

Aksiyon planını PDF olarak indirir. PDF anlık üretilir; dosya sisteminde saklanmaz.

**Yetki:** HR, Manager

**Response:**

```
HTTP 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="aksiyon-plani-1.pdf"

[binary PDF data]
```

> `fetch` kullanıyorsanız `response.blob()` ile alın ve `URL.createObjectURL` ile indirme tetikleyin.

---

## 7. Employee Task Endpointleri

### GET /api/tasks/my

Giriş yapmış çalışanın kendi görev listesini sayfalı döndürür.

**Yetki:** Tüm giriş yapmış kullanıcılar (çalışan olmayan kullanıcılar için `employeeId` olmadığından 400 döner)

**Query Parameters:** `pageNumber`, `pageSize`

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "actionPlanItemId": 1,
      "title": "Departman Yetkinliği 1 Geliştirme Planı",
      "description": "Departmana özgü birincil yetkinliği orta seviyeye taşımak için yapılandırılmış öğrenme programına katılım.",
      "priority": "High",
      "employeeId": 1,
      "employeeName": "Ayşe Kaya",
      "assignedByUserId": 2,
      "assignedByUserName": "HR User",
      "status": "Assigned",
      "assignedAt": "2024-10-16T11:00:00Z",
      "dueDate": null,
      "completedAt": null
    }
  ],
  "totalCount": 13,
  "pageNumber": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

---

### GET /api/tasks/{id}

Görev detayını döndürür.

**Yetki:** Tüm giriş yapmış kullanıcılar (Employee yalnızca kendi görevi)

**Response (200 OK):** `ApiResponse<EmployeeTaskDto>` — aynı format

---

### PUT /api/tasks/{id}/status

Görev durumunu günceller. Yalnızca göreve atanan çalışan kullanabilir.

**Yetki:** Yalnızca Employee rolü

**Request Body:**

```json
{
  "newStatus": "InProgress"
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `newStatus` | string | ✅ | Yeni durum değeri |

**Geçerli Status Geçişleri:**

```
Assigned → InProgress → Completed
Assigned → Cancelled
InProgress → Cancelled
```

**EmployeeTask Status Değerleri:**

| Değer | Açıklama |
|-------|----------|
| `Assigned` | Görev atandı, henüz başlanmadı |
| `InProgress` | Görev üzerinde çalışılıyor |
| `Completed` | Görev tamamlandı |
| `Cancelled` | Görev iptal edildi |

**Response (200 OK):** Güncellenmiş `EmployeeTaskDto`

**Hata (400 Bad Request):** Geçersiz status string veya izin verilmeyen geçiş

---

## 8. Health Endpoint

### GET /api/health

Sistemin sağlık durumunu döndürür. ML servisinin durumunu da içerir.

**Yetki:** Herkese açık

**Response (200 OK):**

```json
{
  "success": true,
  "message": null,
  "data": {
    "api": "ok",
    "mlService": {
      "status": "ok",
      "modelLoaded": true,
      "encoderLoaded": true,
      "featureColumnsLoaded": true,
      "labelNamesLoaded": true
    }
  }
}
```

> ML servisi erişilemez durumdaysa `mlService` alanında hata detayı yer alır.

---

## 9. Hata Yönetimi

### Standart Hata Response Formatı

```json
{
  "success": false,
  "message": "Hata açıklaması",
  "errors": ["Alan 1 zorunludur.", "Email geçersiz."],
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

| Alan | Açıklama |
|------|----------|
| `success` | Her zaman `false` |
| `message` | Genel hata mesajı |
| `errors` | Ayrıntılı hata listesi (validation hatalarında dolu) |
| `correlationId` | Hata izleme ID'si (loglama için backend'e bildirin) |

---

### HTTP Status Kodları

| Kod | Anlam | Ne Zaman |
|-----|-------|----------|
| `200 OK` | Başarılı | GET, PUT, POST (token refresh, logout) |
| `201 Created` | Kayıt oluşturuldu | POST employees, assessments, action-plans/generate |
| `204 No Content` | İçeriksiz başarı | DELETE |
| `400 Bad Request` | Geçersiz istek | Validation hatası, eksik feature, geçersiz parametreler |
| `401 Unauthorized` | Kimlik doğrulama başarısız | Token yok, geçersiz veya süresi dolmuş |
| `403 Forbidden` | Yetki yok | Rol kısıtı (örn. Employee, HR endpointine erişmeye çalışıyor) |
| `404 Not Found` | Kayıt bulunamadı | Geçersiz ID |
| `503 Service Unavailable` | Servis erişilemiyor | ML servisi kapalı veya circuit breaker açık |

---

### Validation Hatası Örneği (400 Bad Request)

```json
{
  "success": false,
  "message": "Validation hatası",
  "errors": [
    "Email zorunludur.",
    "Password en az 8 karakter olmalıdır."
  ],
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### 401 Unauthorized — Ne Yapılmalı?

Token süresi dolduğunda backend `401` döner. Refresh flow'u tetikleyin:

1. `POST /api/auth/refresh` — mevcut refreshToken ile yeni accessToken al
2. Başarılıysa isteği tekrarla
3. Refresh da başarısız olursa (ör. refresh token da süresi dolmuşsa) kullanıcıyı login'e yönlendir

---

## 10. Demo Kullanıcıları

> Uygulama development/demo modunda Mock veri kullanır. Tüm veriler uygulama yeniden başlatılınca sıfırlanır.

| Rol | E-posta | Şifre | EmployeeId | Açıklama |
|-----|---------|-------|-----------|----------|
| Admin | admin@demo.com | Admin1234! | — | Tam sistem erişimi |
| HR | hr@demo.com | Hr1234! | — | İK yöneticisi |
| Manager | manager@demo.com | Manager1234! | 2 | Mehmet Yılmaz — Sales ekip yöneticisi |
| Employee | employee@demo.com | Employee1234! | 1 | Ayşe Kaya — Sales departmanı |

### Seed Veriler

**Departments:**

| ID | Kod | Ad |
|----|-----|----|
| 1 | SALES | Sales |
| 2 | IT | Information Technology |
| 3 | HR | Human Resources |

**Job Roles:**

| ID | Ad | DepartmentId |
|----|-----|-------------|
| 1 | Sales Executive | 1 |
| 2 | Sales Manager | 1 |
| 3 | Software Engineer | 2 |

**Assessment Cycle:**

| ID | Ad |
|----|----|
| 1 | 2024 Q4 Değerlendirmesi |

**Hazır Assessment:** ID=1, EmployeeId=1 (Ayşe Kaya), 13 competency skoru girilmiş, status: `Completed`

---

## 11. Tipik Frontend Akışları

### 11.1 Login Akışı

```
1. Kullanıcı e-posta ve şifre girer
2. POST /api/auth/login
3. Yanıttan şunları al:
   - accessToken  → bellekte sakla (React state, Zustand, vb.)
   - refreshToken → localStorage'da sakla
   - role         → route kısıtları için kullan
   - employeeId   → Employee rolü için task endpointlerinde kullan
4. Tüm korumalı isteklere:
   Authorization: Bearer {accessToken}
   header'ı ekle
```

> **Güvenlik Notu:** Access token'ı localStorage'a kaydetmeyin — XSS saldırılarına karşı savunmasızdır. Memory'de (state) tutun. Refresh token'ı localStorage'da tutmak kabul edilebilir çünkü sadece token yenilemede kullanılır.

---

### 11.2 Token Yenileme Akışı (401 Interceptor)

```
1. Herhangi bir API isteği 401 döndürür
2. localStorage'dan refreshToken'ı al
3. POST /api/auth/refresh  { refreshToken: "..." }
4. Başarılıysa:
   a. Yeni accessToken'ı memory'de güncelle
   b. Yeni refreshToken'ı localStorage'da güncelle
   c. Başarısız olan isteği yeni token ile tekrarla
5. Refresh başarısız olursa:
   a. localStorage'ı temizle
   b. /login sayfasına yönlendir
```

**Axios Interceptor Örneği:**

```javascript
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post('/api/auth/refresh', { refreshToken });
      // memory'deki accessToken'ı güncelle
      setAccessToken(data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

### 11.3 HR/Manager: AI Aksiyon Planı Oluşturma Akışı

```
Adım 1 — Çalışanı seç
  GET /api/employees?pageNumber=1&pageSize=20

Adım 2 — Değerlendirme oluştur
  POST /api/assessments
  { "employeeId": 1, "cycleId": 1 }
  → assessmentId'yi kaydet

Adım 3 — Competency skorlarını gir (13 adet)
  POST /api/assessments/{assessmentId}/scores
  { "competencyId": 1, "evaluatorType": "Manager", "score": 3.5 }
  → Her yetkinlik için tekrarla

Adım 4 — Değerlendirmeyi tamamla
  PUT /api/assessments/{assessmentId}/complete

Adım 5 — (İsteğe bağlı) Feature kontrolü
  GET /api/employees/{employeeId}/features?assessmentId={assessmentId}
  → missingFeatures varsa eksik skorları gir

Adım 6 — Aksiyon planı oluştur
  POST /api/action-plans/generate
  { "assessmentId": 1, "topK": 13 }
  → actionPlanId'yi kaydet

Adım 7 — Planı incele ve düzenle
  GET /api/action-plans/{actionPlanId}
  PUT /api/action-plans/{actionPlanId}/items/{itemId}   (gerekirse)
  DELETE /api/action-plans/{actionPlanId}/items/{itemId} (gerekirse)
  POST /api/action-plans/{actionPlanId}/items            (manuel ekle)

Adım 8 — Planı onayla
  POST /api/action-plans/{actionPlanId}/approve

Adım 9 — Çalışana gönder
  POST /api/action-plans/{actionPlanId}/send
  → Çalışanın görevleri oluşturulur

Adım 10 — (İsteğe bağlı) PDF indir
  GET /api/action-plans/{actionPlanId}/export-pdf
```

---

### 11.4 Employee: Görev Takip Akışı

```
Adım 1 — Görevleri listele
  GET /api/tasks/my?pageNumber=1&pageSize=20

Adım 2 — Göreve tıkla, detay al
  GET /api/tasks/{taskId}

Adım 3 — Göreve başla
  PUT /api/tasks/{taskId}/status
  { "newStatus": "InProgress" }

Adım 4 — Görevi tamamla
  PUT /api/tasks/{taskId}/status
  { "newStatus": "Completed" }
```

---

## 12. Pagination

Listeleme endpointleri `pageNumber` ve `pageSize` query parametrelerini destekler.

### Parametreler

| Parametre | Tip | Varsayılan | Min | Max |
|-----------|-----|-----------|-----|-----|
| `pageNumber` | integer | 1 | 1 | — |
| `pageSize` | integer | 20 | 1 | 100 |

### Örnek İstek

```
GET /api/employees?pageNumber=2&pageSize=10
```

### Örnek Yanıt

```json
{
  "success": true,
  "data": [ ... ],
  "totalCount": 45,
  "pageNumber": 2,
  "pageSize": 10,
  "totalPages": 5
}
```

### Sayfalama Hesaplama

```
totalPages = Math.ceil(totalCount / pageSize)
hasPreviousPage = pageNumber > 1
hasNextPage = pageNumber < totalPages
```

### Sayfalama Bitti mi Kontrolü

```javascript
const hasMore = response.pageNumber < response.totalPages;
```
