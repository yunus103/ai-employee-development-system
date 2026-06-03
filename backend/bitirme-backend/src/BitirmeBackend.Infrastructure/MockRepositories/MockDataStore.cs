using BitirmeBackend.Domain.Entities;
using BitirmeBackend.Domain.Enums;

namespace BitirmeBackend.Infrastructure.MockRepositories;

/// <summary>
/// Centralised in-memory seed data shared across all mock repositories.
/// Passwords stored as BCrypt hashes — never plain text.
/// </summary>
internal static class MockDataStore
{
    // ── Roles ─────────────────────────────────────────────────────────────
    public static List<Role> Roles { get; } =
    [
        new Role { Id = 1, Name = "Admin",    Description = "Full system access",          CreatedAt = DateTime.UtcNow },
        new Role { Id = 2, Name = "HR",       Description = "Human resources management",  CreatedAt = DateTime.UtcNow },
        new Role { Id = 3, Name = "Manager",  Description = "Team management",             CreatedAt = DateTime.UtcNow },
        new Role { Id = 4, Name = "Employee", Description = "Standard employee access",    CreatedAt = DateTime.UtcNow },
    ];

    // ── Departments (referenced by employees) ─────────────────────────────
    public static List<Department> Departments { get; } =
    [
        new Department { Id = 1, Name = "Sales",                Code = "SALES", CreatedAt = DateTime.UtcNow },
        new Department { Id = 2, Name = "Information Technology", Code = "IT",    CreatedAt = DateTime.UtcNow },
        new Department { Id = 3, Name = "Human Resources",       Code = "HR",    CreatedAt = DateTime.UtcNow },
    ];

    // ── Job Roles ─────────────────────────────────────────────────────────
    public static List<JobRole> JobRoles { get; } =
    [
        new JobRole { Id = 1, Name = "Sales Executive", DepartmentId = 1, CreatedAt = DateTime.UtcNow },
        new JobRole { Id = 2, Name = "Sales Manager",   DepartmentId = 1, CreatedAt = DateTime.UtcNow },
        new JobRole { Id = 3, Name = "Software Engineer", DepartmentId = 2, CreatedAt = DateTime.UtcNow },
    ];

    // ── Employees ─────────────────────────────────────────────────────────
    public static List<Employee> Employees { get; } =
    [
        new Employee
        {
            Id = 1, EmployeeCode = "EMP001", FullName = "Ayşe Kaya",
            Email = "employee@demo.com", Age = 32, Gender = "Female",
            DepartmentId = 1, JobRoleId = 1, ManagerId = 2,
            Education = "3", EducationField = "Life Sciences",
            BusinessTravel = "Travel_Rarely", MaritalStatus = "Single",
            DistanceFromHome = 5, EnvironmentSatisfaction = 3, JobSatisfaction = 4,
            WorkLifeBalance = 3, TotalWorkingYears = 8, YearsAtCompany = 5,
            YearsInCurrentRole = 3, YearsWithCurrManager = 2,
            PerformanceScore = 3.5, Attrition = "No", IsActive = true,
            CreatedAt = DateTime.UtcNow
        },
        new Employee
        {
            Id = 2, EmployeeCode = "MGR001", FullName = "Mehmet Yılmaz",
            Email = "manager@demo.com", Age = 40, Gender = "Male",
            DepartmentId = 1, JobRoleId = 2, ManagerId = null,
            Education = "4", EducationField = "Business",
            BusinessTravel = "Travel_Frequently", MaritalStatus = "Married",
            DistanceFromHome = 10, EnvironmentSatisfaction = 4, JobSatisfaction = 4,
            WorkLifeBalance = 3, TotalWorkingYears = 15, YearsAtCompany = 8,
            YearsInCurrentRole = 5, YearsWithCurrManager = 3,
            PerformanceScore = 4.2, Attrition = "No", IsActive = true,
            CreatedAt = DateTime.UtcNow
        },
        new Employee
        {
            Id = 3, EmployeeCode = "EMP002", FullName = "Ali Demir",
            Email = "ali.demir@demo.com", Age = 28, Gender = "Male",
            DepartmentId = 2, JobRoleId = 3, ManagerId = null,
            Education = "4", EducationField = "Computer Science",
            BusinessTravel = "Non-Travel", MaritalStatus = "Single",
            DistanceFromHome = 3, EnvironmentSatisfaction = 4, JobSatisfaction = 3,
            WorkLifeBalance = 4, TotalWorkingYears = 5, YearsAtCompany = 3,
            YearsInCurrentRole = 2, YearsWithCurrManager = 2,
            PerformanceScore = 3.8, Attrition = "No", IsActive = true,
            CreatedAt = DateTime.UtcNow
        },
    ];

    // ── Users (passwords as BCrypt hashes) ───────────────────────────────
    public static List<User> Users { get; } =
    [
        new User
        {
            Id = 1, FullName = "Admin User", Email = "admin@demo.com",
            PasswordHash = "$2a$11$zfRkFzsfjJ/dMsTdAhq.ie1gKjkUH6hRdzo.8yAZTQLLWgpwhQ4QC", // Admin1234!
            RoleId = 1, EmployeeId = null, IsActive = true, CreatedAt = DateTime.UtcNow
        },
        new User
        {
            Id = 2, FullName = "HR User", Email = "hr@demo.com",
            PasswordHash = "$2a$11$nCoV4NjJ9bj4oP5K3riM2e4gNOPO0Kk3rKmwWZI2ne6gXrnPM.Rym", // Hr1234!
            RoleId = 2, EmployeeId = null, IsActive = true, CreatedAt = DateTime.UtcNow
        },
        new User
        {
            Id = 3, FullName = "Mehmet Yılmaz", Email = "manager@demo.com",
            PasswordHash = "$2a$11$/EjKk6BgJtPAZjDW3H9zmeHaUMH.nbtF11lhEvhE7dISI5DPAlmcy", // Manager1234!
            RoleId = 3, EmployeeId = 2, IsActive = true, CreatedAt = DateTime.UtcNow
        },
        new User
        {
            Id = 4, FullName = "Ayşe Kaya", Email = "employee@demo.com",
            PasswordHash = "$2a$11$uDROGAG.L2IJ/zDLlS/UjOXaiCpVo7/QCchgwykadmU3HLEhjR/A2", // Employee1234!
            RoleId = 4, EmployeeId = 1, IsActive = true, CreatedAt = DateTime.UtcNow
        },
    ];

    // ── Competencies ──────────────────────────────────────────────────────
    public static List<Competency> Competencies { get; } =
    [
        new Competency { Id = 1,  Code = "Core_Communication",  Name = "İletişim",             Category = "Core", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 2,  Code = "Core_Teamwork",       Name = "Takım Çalışması",       Category = "Core", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 3,  Code = "Core_ProblemSolving", Name = "Problem Çözme",         Category = "Core", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 4,  Code = "Core_Adaptability",   Name = "Uyum Yeteneği",         Category = "Core", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 5,  Code = "Core_Initiative",     Name = "İnisiyatif Alma",       Category = "Core", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 6,  Code = "Core_Accountability", Name = "Sorumluluk Bilinci",    Category = "Core", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 7,  Code = "Core_LearningAgility", Name = "Öğrenme Çevikliği",    Category = "Core", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 8,  Code = "Core_TimeManagement", Name = "Zaman Yönetimi",        Category = "Core", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 9,  Code = "Dept_Comp1",          Name = "Departman Yetkinliği 1",Category = "Department", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 10, Code = "Dept_Comp2",          Name = "Departman Yetkinliği 2",Category = "Department", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 11, Code = "Dept_Comp3",          Name = "Departman Yetkinliği 3",Category = "Department", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 12, Code = "Role_Comp1",          Name = "Rol Yetkinliği 1",      Category = "Role", IsActive = true, CreatedAt = DateTime.UtcNow },
        new Competency { Id = 13, Code = "Role_Comp2",          Name = "Rol Yetkinliği 2",      Category = "Role", IsActive = true, CreatedAt = DateTime.UtcNow },
    ];

    // ── Assessment Cycle ─────────────────────────────────────────────────
    public static List<AssessmentCycle> AssessmentCycles { get; } =
    [
        new AssessmentCycle
        {
            Id = 1, Name = "2024 Q4 Değerlendirmesi",
            StartDate = new DateTime(2024, 10, 1), EndDate = new DateTime(2024, 12, 31),
            Status = "Active", CreatedAt = DateTime.UtcNow
        }
    ];

    // ── Assessments ───────────────────────────────────────────────────────
    public static List<Assessment> Assessments { get; } =
    [
        new Assessment
        {
            Id = 1, EmployeeId = 1, CycleId = 1, OverallScore = 3.5,
            Status = Domain.Enums.AssessmentStatus.Completed, CreatedByUserId = 2,
            CreatedAt = DateTime.UtcNow
        }
    ];

    // ── Assessment Scores (for Employee 1, covering all 13 competency codes) ──
    public static List<AssessmentScore> AssessmentScores { get; } =
    [
        new AssessmentScore { Id = 1,  AssessmentId = 1, CompetencyId = 1,  EvaluatorType = EvaluatorType.Manager, Score = 3.2, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 2,  AssessmentId = 1, CompetencyId = 2,  EvaluatorType = EvaluatorType.Manager, Score = 3.7, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 3,  AssessmentId = 1, CompetencyId = 3,  EvaluatorType = EvaluatorType.Manager, Score = 3.5, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 4,  AssessmentId = 1, CompetencyId = 4,  EvaluatorType = EvaluatorType.Manager, Score = 3.1, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 5,  AssessmentId = 1, CompetencyId = 5,  EvaluatorType = EvaluatorType.Manager, Score = 3.0, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 6,  AssessmentId = 1, CompetencyId = 6,  EvaluatorType = EvaluatorType.Manager, Score = 3.8, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 7,  AssessmentId = 1, CompetencyId = 7,  EvaluatorType = EvaluatorType.Manager, Score = 3.4, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 8,  AssessmentId = 1, CompetencyId = 8,  EvaluatorType = EvaluatorType.Manager, Score = 2.9, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 9,  AssessmentId = 1, CompetencyId = 9,  EvaluatorType = EvaluatorType.Manager, Score = 3.5, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 10, AssessmentId = 1, CompetencyId = 10, EvaluatorType = EvaluatorType.Manager, Score = 3.0, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 11, AssessmentId = 1, CompetencyId = 11, EvaluatorType = EvaluatorType.Manager, Score = 3.6, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 12, AssessmentId = 1, CompetencyId = 12, EvaluatorType = EvaluatorType.Manager, Score = 3.4, CreatedAt = DateTime.UtcNow },
        new AssessmentScore { Id = 13, AssessmentId = 1, CompetencyId = 13, EvaluatorType = EvaluatorType.Manager, Score = 3.1, CreatedAt = DateTime.UtcNow },
    ];

    // ── Action Catalog (13 codes that FakeMlPredictionClient returns) ─────
    public static List<ActionCatalog> ActionCatalog { get; } =
    [
        new ActionCatalog { Id = 1,  Code = "DEPT_COMP1_03", Title = "Departman Yetkinliği 1 Geliştirme Planı",        Description = "Departmana özgü birincil yetkinliği orta seviyeye taşımak için yapılandırılmış öğrenme programına katılım.",  DefaultPriority = PriorityLevel.High,   EstimatedDurationDays = 30, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 2,  Code = "ROLE_COMP1_03", Title = "Rol Yetkinliği 1 Uygulama Projesi",              Description = "Role özgü birincil yetkinliği pekiştirmek için gerçek iş senaryoları üzerinde mentörlük eşliğinde çalışma.",  DefaultPriority = PriorityLevel.High,   EstimatedDurationDays = 45, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 3,  Code = "ROLE_COMP2_03", Title = "Rol Yetkinliği 2 Gelişim Atölyesi",              Description = "Role özgü ikincil yetkinliğin orta seviyeye çıkarılması için atölye çalışması ve vaka analizi.",                DefaultPriority = PriorityLevel.High,   EstimatedDurationDays = 21, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 4,  Code = "DEPT_COMP3_03", Title = "Departman Yetkinliği 3 Sertifikasyon Programı",  Description = "Departmana özgü üçüncü yetkinlik alanında sertifika programına kaydolma ve tamamlama.",                          DefaultPriority = PriorityLevel.Medium, EstimatedDurationDays = 60, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 5,  Code = "CORE_ACCT_04",  Title = "Sorumluluk Bilinci İleri Seviye Gelişimi",       Description = "Sorumluluk alma ve hesap verebilirlik konusunda vaka çalışmaları ve akran geri bildirimiyle ileri seviye gelişim.", DefaultPriority = PriorityLevel.Medium, EstimatedDurationDays = 30, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 6,  Code = "CORE_INIT_03",  Title = "İnisiyatif Alma Becerileri Programı",            Description = "Proaktif davranış ve inisiyatif alma becerilerini geliştirmeye yönelik koçluk seansları.",                       DefaultPriority = PriorityLevel.Medium, EstimatedDurationDays = 21, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 7,  Code = "CORE_TIME_03",  Title = "Zaman Yönetimi Optimizasyon Planı",              Description = "Önceliklendirme teknikleri ve üretkenlik araçları kullanarak zaman yönetimini orta seviyeye taşıma.",           DefaultPriority = PriorityLevel.Medium, EstimatedDurationDays = 14, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 8,  Code = "DEPT_COMP2_03", Title = "Departman Yetkinliği 2 Çapraz Eğitim",           Description = "Departmana özgü ikincil yetkinliği geliştirmek için farklı birimlerle çapraz eğitim ve rotasyon programı.",     DefaultPriority = PriorityLevel.Medium, EstimatedDurationDays = 30, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 9,  Code = "CORE_COMM_03",  Title = "İletişim Becerileri Sunum ve Yazılı İfade",      Description = "Sözlü ve yazılı iletişim becerilerini orta seviyeye çıkarmak için sunum eğitimi ve yazılı ifade atölyesi.",      DefaultPriority = PriorityLevel.Medium, EstimatedDurationDays = 21, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 10, Code = "CORE_LEARN_04", Title = "Öğrenme Çevikliği İleri Seviye Programı",        Description = "Hızlı değişen ortamlara adaptasyon ve yeni beceri kazanım hızını artırmak için ileri seviye öğrenme programı.",   DefaultPriority = PriorityLevel.Low,    EstimatedDurationDays = 45, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 11, Code = "CORE_TEAM_04",  Title = "Takım Çalışması ve İşbirliği İleri Seviye",      Description = "Ekip dinamikleri ve ortak hedeflere ulaşma konusunda ileri seviye takım çalışması eğitimi.",                     DefaultPriority = PriorityLevel.Low,    EstimatedDurationDays = 21, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 12, Code = "CORE_ADAPT_03", Title = "Değişime Uyum Yeteneği Koçluk Programı",         Description = "Değişim yönetimi ve esneklik becerilerini orta seviyeye taşımak için bireysel koçluk seansları.",                DefaultPriority = PriorityLevel.Low,    EstimatedDurationDays = 30, IsActive = true, CreatedAt = DateTime.UtcNow },
        new ActionCatalog { Id = 13, Code = "CORE_PROB_04",  Title = "Problem Çözme İleri Analitik Düşünce",           Description = "Analitik düşünce ve yaratıcı problem çözme yöntemlerinde ileri seviye uygulama ve simülasyon çalışmaları.",      DefaultPriority = PriorityLevel.Low,    EstimatedDurationDays = 30, IsActive = true, CreatedAt = DateTime.UtcNow },
    ];

    // ── Model Version ─────────────────────────────────────────────────────
    public static List<ModelVersion> ModelVersions { get; } =
    [
        new ModelVersion
        {
            Id = 1, ModelName = "LightGBM", Version = "Final_LightGBM_v1",
            Description = "LightGBM multi-label classifier for action recommendation",
            MicroF1 = 0.82, MacroF1 = 0.78, RocAuc = 0.91, HammingLoss = 0.09,
            IsActive = true, CreatedAt = DateTime.UtcNow
        }
    ];

    // ── Refresh Tokens (starts empty, filled at runtime) ─────────────────
    public static List<RefreshToken> RefreshTokens { get; } = [];

    // ── Action Plans (starts empty) ───────────────────────────────────────
    public static List<ActionPlan> ActionPlans { get; } = [];
    public static List<ActionPlanItem> ActionPlanItems { get; } = [];

    // ── AI Prediction data (starts empty) ─────────────────────────────────
    public static List<AiPredictionRun> AiPredictionRuns { get; } = [];
    public static List<AiPredictedAction> AiPredictedActions { get; } = [];

    // ── Employee Tasks (starts empty) ─────────────────────────────────────
    public static List<EmployeeTask> EmployeeTasks { get; } = [];

    // ── ID counters ────────────────────────────────────────────────────────
    public static int NextUserId { get; set; } = 10;
    public static int NextEmployeeId { get; set; } = 10;
    public static int NextAssessmentId { get; set; } = 10;
    public static int NextAssessmentScoreId { get; set; } = 20;
    public static int NextRefreshTokenId { get; set; } = 1;
    public static int NextActionPlanId { get; set; } = 1;
    public static int NextActionPlanItemId { get; set; } = 1;
    public static int NextAiRunId { get; set; } = 1;
    public static int NextAiActionId { get; set; } = 1;
    public static int NextEmployeeTaskId { get; set; } = 1;
}
