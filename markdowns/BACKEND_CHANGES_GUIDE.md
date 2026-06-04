# Backend Entegrasyon Rehberi: Yapılan Değişiklikler ve Kod Kodları

Bu doküman, lokal backend üzerinde yaptığımız tüm değişiklikleri, eklenen doğrulama mantıklarını, servis güncellemelerini ve test değişikliklerini adım adım ve kod bloklarıyla açıklamaktadır. Arkadaşınız kendi lokal backend projesinde bu adımları sırayla takip ederek projeyi tamamen uyumlu hale getirebilir.

---

## İçindekiler

1. [Giriş ve Genel Bakış](#1-giriş-ve-genel-bakış)
2. [Data Transfer Object (DTO) Değişiklikleri](#2-data-transfer-object-dto-değişiklikleri)
3. [Değerlendirme Servisi (`AssessmentService.cs`) Değişiklikleri](#3-değerlendirme-servisi-assessmentservicecs-değişiklikleri)
4. [Aksiyon Planı Servisi (`ActionPlanService.cs`) Değişiklikleri](#4-aksiyon-planı-servisi-actionplanservicecs-değişiklikleri)
5. [Görev Takip Servisi (`EmployeeTaskService.cs`) Değişiklikleri](#5-görev-takip-servisi-employeetaskservicecs-değişiklikleri)
6. [PDF Çıktısı Sıralama (`PdfExportService.cs`) Değişiklikleri](#6-pdf-çıktısı-sıralama-pdfexportservicecs-değişiklikleri)
7. [Mock Veri Deposu (`MockActionPlanRepository.cs`) Değişiklikleri](#7-mock-veri-deposu-mockactionplanrepositorycs-değişiklikleri)
8. [Birim Test (Unit Test) Güncellemeleri](#8-birim-test-unit-test-güncellemeleri)
9. [API Dokümantasyonu Güncellemeleri](#9-api-dokümantasyonu-güncellemeleri)

---

## 1. Giriş ve Genel Bakış

Yapılan geliştirmeler temel olarak çalışanın gelişim planı yaşam döngüsünü daha güvenli hale getirmeyi, görevlerin plan durumuyla entegrasyonunu sağlamayı ve frontend'e daha zengin veri sunmayı hedefler:
- **Aktif Plan Doğrulaması:** Çalışanın devam eden tamamlanmamış (status != `Completed` veya `Cancelled`) bir planı varsa yeni assessment başlatılması veya yeni gelişim planı oluşturulması engellendi.
- **Otomatik Plan Tamamlama:** Çalışan tüm görevlerini tamamladığında gelişim planı otomatik olarak `Completed` statüsüne geçer.
- **Sıralama:** Görevler ve plan kalemleri tamamlananlar en sonda, önceliği yüksek olanlar (`High` -> `Medium` -> `Low`) en başta olacak şekilde sıralanır.
- **Zenginleştirilmiş DTO:** Aksiyon planı kalemlerine ilgili görevin durumunu belirten `TaskStatus` alanı eklendi.

---

## 2. Data Transfer Object (DTO) Değişiklikleri

### Dosya: `backend/bitirme-backend/src/BitirmeBackend.Contracts/Responses/ActionPlanItemDto.cs`

Aksiyon planı kalemlerini frontend'e dönerken görevin tamamlanma durumunu gösterebilmek amacıyla `TaskStatus` alanı eklendi.

**Yapılacak Değişiklik:**

```diff
@@ -12,4 +12,5 @@ public class ActionPlanItemDto
     public DateTime? DueDate { get; set; }
     public string Source { get; set; } = string.Empty;
     public int OrderNo { get; set; }
+    public string? TaskStatus { get; set; }
 }
```

---

## 3. Değerlendirme Servisi (`AssessmentService.cs`) Değişiklikleri

### Dosya: `backend/bitirme-backend/src/BitirmeBackend.Application/Services/AssessmentService.cs`

Yeni bir değerlendirme süreci başlatılmadan önce çalışanın aktif ve bitmemiş bir gelişim planı olup olmadığı kontrol edilir. Bu kısıt için `IActionPlanRepository` servise enjekte edildi.

**Yapılacak Değişiklikler:**

1. **Constructor ve Bağımlılık Enjeksiyonu:**
```diff
@@ -11,10 +11,12 @@ namespace BitirmeBackend.Application.Services;
 public class AssessmentService : IAssessmentService
 {
     private readonly IAssessmentRepository _assessments;
+    private readonly IActionPlanRepository _actionPlans;
 
-    public AssessmentService(IAssessmentRepository assessments)
+    public AssessmentService(IAssessmentRepository assessments, IActionPlanRepository actionPlans)
     {
         _assessments = assessments;
+        _actionPlans = actionPlans;
     }
```

2. **`CreateAssessmentAsync` Metodunda Doğrulama:**
```diff
@@ -26,6 +28,14 @@ public class AssessmentService : IAssessmentService
 
     public async Task<AssessmentDetailDto> CreateAssessmentAsync(CreateAssessmentRequest request, int createdByUserId)
     {
+        // Check if there is an active incomplete plan for this employee (Draft, Edited, Approved, Sent)
+        var plans = await _actionPlans.GetByEmployeeIdAsync(request.EmployeeId);
+        var activePlan = plans.FirstOrDefault(p => p.Status != ActionPlanStatus.Completed && p.Status != ActionPlanStatus.Cancelled);
+        if (activePlan != null)
+        {
+            throw new ArgumentException("Çalışanın devam eden tamamlanmamış bir gelişim planı bulunmaktadır. Yeni bir değerlendirme süreci başlatılamaz.");
+        }
+
         var assessment = new Assessment
         {
```

---

## 4. Aksiyon Planı Servisi (`ActionPlanService.cs`) Değişiklikleri

### Dosya: `backend/bitirme-backend/src/BitirmeBackend.Application/Services/ActionPlanService.cs`

Bu serviste üç önemli değişiklik yapılmıştır:
- Yeni plan oluşturulurken çalışanın aktif bitmemiş bir planı olup olmadığı doğrulanır.
- Kalemler dönülürken `TaskStatus` alanı doldurulur.
- Kalemler tamamlananlar sonda olacak şekilde sıralanır.

**Yapılacak Değişiklikler:**

1. **`CreateActionPlanAsync` Metodunda Doğrulama:**
```diff
@@ -56,6 +56,12 @@ public class ActionPlanService : IActionPlanService
         if (existingPlan is not null)
             throw new ArgumentException("Bu assessment için zaten aktif bir aksiyon planı mevcut.");
 
+        // Check if there is an active incomplete plan for this employee from ANY assessment cycle
+        var employeePlans = await _actionPlans.GetByEmployeeIdAsync(employeeId);
+        var activeIncompletePlan = employeePlans.FirstOrDefault(p => p.Status != ActionPlanStatus.Completed && p.Status != ActionPlanStatus.Cancelled);
+        if (activeIncompletePlan != null)
+            throw new ArgumentException("Çalışanın devam eden tamamlanmamış bir gelişim planı bulunmaktadır. Yeni bir plan oluşturulamaz.");
+
         // Step 4: ML health check
```

2. **Dönüş Kalemlerinin Sıralanması:**
```diff
@@ -438,7 +444,9 @@ public class ActionPlanService : IActionPlanService
         UpdatedAt        = plan.UpdatedAt,
         Items            = plan.Items
             .Where(i => !i.IsDeleted)
-            .OrderBy(i => i.OrderNo)
+            .OrderBy(i => i.EmployeeTasks.Any(t => !t.IsDeleted && t.Status == EmployeeTaskStatus.Completed) ? 1 : 0)
+            .ThenByDescending(i => i.Priority)
+            .ThenBy(i => i.OrderNo)
             .Select(ToItemDto)
     };
```

3. **`ToItemDto` Eşlemesinde `TaskStatus` Değerinin Atanması:**
```diff
@@ -453,6 +461,7 @@ public class ActionPlanService : IActionPlanService
         Priority            = item.Priority.ToString(),
         DueDate             = item.DueDate,
         Source              = item.Source.ToString(),
-        OrderNo             = item.OrderNo
+        OrderNo             = item.OrderNo,
+        TaskStatus          = item.EmployeeTasks?.FirstOrDefault(t => !t.IsDeleted)?.Status.ToString()
     };
 }
```

---

## 5. Görev Takip Servisi (`EmployeeTaskService.cs`) Değişiklikleri

### Dosya: `backend/bitirme-backend/src/BitirmeBackend.Application/Services/EmployeeTaskService.cs`

Bir çalışanın görevi tamamlandığında (`Completed`), bağlı olduğu gelişim planındaki tüm diğer görevlerin tamamlanıp tamamlanmadığı kontrol edilir. Eğer hepsi tamamlanmışsa, gelişim planının durumu otomatik olarak `Completed` (5) yapılır. Bunun için `IActionPlanRepository` servise enjekte edilmiştir.

**Yapılacak Değişiklikler:**

1. **Constructor ve Bağımlılık Enjeksiyonu:**
```diff
@@ -9,11 +9,13 @@ namespace BitirmeBackend.Application.Services;
 public class EmployeeTaskService : IEmployeeTaskService
 {
     private readonly IEmployeeTaskRepository _tasks;
+    private readonly IActionPlanRepository _actionPlans;
     private readonly IUnitOfWork _uow;
 
-    public EmployeeTaskService(IEmployeeTaskRepository tasks, IUnitOfWork uow)
+    public EmployeeTaskService(IEmployeeTaskRepository tasks, IActionPlanRepository actionPlans, IUnitOfWork uow)
     {
         _tasks = tasks;
+        _actionPlans = actionPlans;
         _uow   = uow;
     }
```

2. **`UpdateTaskStatusAsync` İçinde Otomatik Plan Tamamlama Mantığı:**
```diff
@@ -73,6 +75,35 @@ public class EmployeeTaskService : IEmployeeTaskService
         _tasks.Update(task);
         await _uow.SaveChangesAsync();
 
+        if (newStatus == EmployeeTaskStatus.Completed && task.ActionPlanItem != null)
+        {
+            var planId = task.ActionPlanItem.ActionPlanId;
+            var plan = await _actionPlans.GetByIdWithItemsAsync(planId);
+            if (plan != null)
+            {
+                var activeItems = plan.Items.Where(i => !i.IsDeleted).ToList();
+                bool allCompleted = true;
+                foreach (var pi in activeItems)
+                {
+                    var planItemTasks = await _tasks.GetByActionPlanItemIdAsync(pi.Id);
+                    var t = planItemTasks.FirstOrDefault();
+                    if (t == null || t.Status != EmployeeTaskStatus.Completed)
+                    {
+                        allCompleted = false;
+                        break;
+                    }
+                }
+
+                if (allCompleted)
+                {
+                    plan.Status = ActionPlanStatus.Completed;
+                    plan.UpdatedAt = DateTime.UtcNow;
+                    _actionPlans.Update(plan);
+                    await _uow.SaveChangesAsync();
+                }
+            }
+        }
+
         return ToDto(task);
     }
```

---

## 6. PDF Çıktısı Sıralama (`PdfExportService.cs`) Değişiklikleri

### Dosya: `backend/bitirme-backend/src/BitirmeBackend.Infrastructure/Pdf/PdfExportService.cs`

PDF raporu indirildiğinde de aksiyon planı kalemlerinin completed olanlar sonda, önceliği yüksek olanlar başta olacak şekilde sıralanması sağlanmıştır.

**Yapılacak Değişiklik:**

```diff
@@ -39,8 +39,13 @@ public class PdfExportService : IPdfExportService
         // 2. Load assessment (for cycle name)
         var assessment = await _assessments.GetByIdWithDetailsAsync(plan.AssessmentId);
 
-        // 3. Active items only
-        var items = plan.Items.Where(i => !i.IsDeleted).OrderBy(i => i.OrderNo).ToList();
+        // 3. Active items only sorted by completion status (completed last), then priority, then OrderNo
+        var items = plan.Items
+            .Where(i => !i.IsDeleted)
+            .OrderBy(i => i.EmployeeTasks.Any(t => !t.IsDeleted && t.Status == EmployeeTaskStatus.Completed) ? 1 : 0)
+            .ThenByDescending(i => i.Priority)
+            .ThenBy(i => i.OrderNo)
+            .ToList();
 
         // 4. Load EmployeeTasks for each item
```

---

## 7. Mock Veri Deposu (`MockActionPlanRepository.cs`) Değişiklikleri

### Dosya: `backend/bitirme-backend/src/BitirmeBackend.Infrastructure/MockRepositories/MockActionPlanRepository.cs`

Lokal testlerde ve demo modunda kullanılan sahte veri deposunun, aksiyon planı yüklendiğinde ilişkili görevleri (EmployeeTasks) de yüklemesi sağlanmıştır. Bu sayede sıralama ve doğrulama kodları mock verilerle de sorunsuz çalışır.

**Yapılacak Değişiklik:**

```diff
@@ -20,9 +20,16 @@ public class MockActionPlanRepository : IActionPlanRepository
             plan.Employee       = MockDataStore.Employees.FirstOrDefault(e => e.Id == plan.EmployeeId)!;
             plan.CreatedByUser  = MockDataStore.Users.FirstOrDefault(u => u.Id == plan.CreatedByUserId)!;
             // Items: only non-deleted ones
-            plan.Items = MockDataStore.ActionPlanItems
                 .Where(i => i.ActionPlanId == plan.Id && !i.IsDeleted)
                 .ToList();
+            var items = MockDataStore.ActionPlanItems
+                .Where(i => i.ActionPlanId == plan.Id && !i.IsDeleted)
+                .ToList();
+            foreach (var item in items)
+            {
+                item.EmployeeTasks = MockDataStore.EmployeeTasks
+                    .Where(t => t.ActionPlanItemId == item.Id && !t.IsDeleted)
+                    .ToList();
+            }
+            plan.Items = items;
         }
         return Task.FromResult(plan);
     }
```

---

## 8. Birim Test (Unit Test) Güncellemeleri

Constructor değişiklikleri ve yeni repository bağımlılıkları sebebiyle birim test sınıflarının mock yapılandırmaları güncellenmiştir.

### 8.1 ActionPlanService Testleri
**Dosya:** `backend/bitirme-backend/tests/BitirmeBackend.Tests/ActionPlanServiceTests.cs`

**Yapılacak Değişiklik:**

```diff
@@ -139,6 +139,7 @@ public class ActionPlanServiceTests
 
         m.Assessments.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(assessment);
         m.ActionPlans.Setup(r => r.GetActiveByAssessmentIdAsync(1)).ReturnsAsync((ActionPlan?)null);
+        m.ActionPlans.Setup(r => r.GetByEmployeeIdAsync(assessment.EmployeeId)).ReturnsAsync(new List<ActionPlan>());
         m.MlClient.Setup(c => c.IsHealthyAsync()).ReturnsAsync(true);
         m.EmployeeService.Setup(s => s.GetEmployeeFeaturesForPredictionAsync(assessment.EmployeeId, 1))
                          .ReturnsAsync(MakeFeatures());
@@ -200,6 +201,7 @@ public class ActionPlanServiceTests
 
         m.Assessments.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(MakeAssessment());
         m.ActionPlans.Setup(r => r.GetActiveByAssessmentIdAsync(1)).ReturnsAsync((ActionPlan?)null);
+        m.ActionPlans.Setup(r => r.GetByEmployeeIdAsync(10)).ReturnsAsync(new List<ActionPlan>());
         m.MlClient.Setup(c => c.IsHealthyAsync()).ReturnsAsync(true);
         m.EmployeeService.Setup(s => s.GetEmployeeFeaturesForPredictionAsync(It.IsAny<int>(), It.IsAny<int>()))
                          .ReturnsAsync(MakeFeatures());
```

### 8.2 EmployeeTaskService Testleri
**Dosya:** `backend/bitirme-backend/tests/BitirmeBackend.Tests/EmployeeTaskServiceTests.cs`

**Yapılacak Değişiklik:**

```diff
@@ -10,11 +10,12 @@ namespace BitirmeBackend.Tests;
 public class EmployeeTaskServiceTests
 {
     private static EmployeeTaskService Build(
-        Mock<IEmployeeTaskRepository> repo, Mock<IUnitOfWork>? uow = null)
+        Mock<IEmployeeTaskRepository> repo, Mock<IUnitOfWork>? uow = null, Mock<IActionPlanRepository>? planRepo = null)
     {
         uow ??= new Mock<IUnitOfWork>();
         uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);
-        return new EmployeeTaskService(repo.Object, uow.Object);
+        planRepo ??= new Mock<IActionPlanRepository>();
+        return new EmployeeTaskService(repo.Object, planRepo.Object, uow.Object);
     }
 
     private static EmployeeTask MakeTask(
```

---

## 9. API Dokümantasyonu Güncellemeleri

Yukarıdaki değişiklikler doğrultusunda frontend ile entegrasyonu sağlayan `markdowns/API_DOCUMENTATION.md` dosyasında şu güncellemeler yapılmıştır:
1. `POST /api/assessments` ve `POST /api/action-plans/generate` isteklerinde çalışanın aktif gelişim planı olması durumunda dönecek `400 Bad Request` yanıtı ve validation kuralları belgelenmiştir.
2. `GET /api/action-plans/{id}` ve `GET /api/employees/{id}/action-plans` endpoint çıktılarında `taskStatus` alanının varlığı ve completed olanların sonda gösterileceğine dair **sıralama kuralları** belgelenmiştir.
3. `PUT /api/tasks/{id}/status` altında, tüm görevler tamamlandığında planda otomatik tetiklenen durum geçişi açıklanmıştır.
4. Dokümanın sonuna frontend mock API simülasyon mantığı (sahte db, bellek ve doğrulama simülasyonu) eklenmiştir.
