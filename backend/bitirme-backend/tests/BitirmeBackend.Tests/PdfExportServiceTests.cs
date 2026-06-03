using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Domain.Entities;
using BitirmeBackend.Domain.Enums;
using BitirmeBackend.Infrastructure.Pdf;
using FluentAssertions;
using Moq;

namespace BitirmeBackend.Tests;

public class PdfExportServiceTests
{
    private static PdfExportService Build(
        Mock<IActionPlanRepository>   planRepo,
        Mock<IAssessmentRepository>   assessmentRepo,
        Mock<IEmployeeTaskRepository> taskRepo) =>
        new(planRepo.Object, assessmentRepo.Object, taskRepo.Object);

    private static ActionPlan MakeFullPlan(int id = 1) => new()
    {
        Id              = id,
        AssessmentId    = 1,
        EmployeeId      = 10,
        CreatedByUserId = 2,
        Status          = ActionPlanStatus.Sent,
        CreatedAt       = DateTime.UtcNow.AddDays(-3),
        ApprovedAt      = DateTime.UtcNow.AddDays(-1),
        SentAt          = DateTime.UtcNow.AddHours(-2),
        Employee = new Employee
        {
            Id       = 10,
            FullName = "Ayşe Kaya",
            Department = new Department { Id = 1, Name = "Satış" },
            JobRole    = new JobRole    { Id = 1, Name = "Satış Uzmanı" }
        },
        CreatedByUser = new User { Id = 2, FullName = "HR User" },
        Items =
        [
            new ActionPlanItem
            {
                Id           = 1,
                ActionPlanId = id,
                Title        = "İletişim Geliştirme",
                Description  = "Sözlü iletişim becerileri",
                Priority     = PriorityLevel.High,
                Source       = ActionPlanItemSource.AI,
                OrderNo      = 1,
                IsDeleted    = false
            },
            new ActionPlanItem
            {
                Id           = 2,
                ActionPlanId = id,
                Title        = "Zaman Yönetimi",
                Description  = "Önceliklendirme",
                Priority     = PriorityLevel.Medium,
                Source       = ActionPlanItemSource.Manual,
                OrderNo      = 2,
                IsDeleted    = false
            }
        ]
    };

    [Fact]
    public async Task GenerateActionPlanPdfAsync_ValidPlan_ReturnsByteArray()
    {
        var planRepo       = new Mock<IActionPlanRepository>();
        var assessmentRepo = new Mock<IAssessmentRepository>();
        var taskRepo       = new Mock<IEmployeeTaskRepository>();

        var plan       = MakeFullPlan();
        var assessment = new Assessment
        {
            Id         = 1,
            EmployeeId = 10,
            Cycle      = new AssessmentCycle { Id = 1, Name = "2024 Q4" }
        };

        planRepo.Setup(r => r.GetByIdWithItemsAsync(1)).ReturnsAsync(plan);
        assessmentRepo.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(assessment);
        taskRepo.Setup(r => r.GetByActionPlanItemIdAsync(It.IsAny<int>()))
                .ReturnsAsync(Enumerable.Empty<EmployeeTask>());

        var svc    = Build(planRepo, assessmentRepo, taskRepo);
        var result = await svc.GenerateActionPlanPdfAsync(1);

        result.Should().NotBeNull();
        result.Should().NotBeEmpty();
        result.Length.Should().BeGreaterThan(100); // a real PDF is many bytes
    }

    [Fact]
    public async Task GenerateActionPlanPdfAsync_InvalidPlanId_ThrowsKeyNotFoundException()
    {
        var planRepo       = new Mock<IActionPlanRepository>();
        var assessmentRepo = new Mock<IAssessmentRepository>();
        var taskRepo       = new Mock<IEmployeeTaskRepository>();

        planRepo.Setup(r => r.GetByIdWithItemsAsync(It.IsAny<int>())).ReturnsAsync((ActionPlan?)null);

        var svc = Build(planRepo, assessmentRepo, taskRepo);
        await svc.Invoking(s => s.GenerateActionPlanPdfAsync(999))
                 .Should().ThrowAsync<KeyNotFoundException>()
                 .WithMessage("*bulunamadı*");
    }
}
