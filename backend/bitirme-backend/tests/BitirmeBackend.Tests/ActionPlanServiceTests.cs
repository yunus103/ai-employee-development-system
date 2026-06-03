using BitirmeBackend.Application.Interfaces;
using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Application.Services;
using BitirmeBackend.Contracts.Dtos;
using BitirmeBackend.Contracts.Requests;
using BitirmeBackend.Contracts.Responses;
using BitirmeBackend.Domain.Entities;
using BitirmeBackend.Domain.Enums;
using FluentAssertions;
using Moq;

namespace BitirmeBackend.Tests;

public class ActionPlanServiceTests
{
    // ── Builder ───────────────────────────────────────────────────────────────

    private record Mocks(
        Mock<IAssessmentRepository>    Assessments,
        Mock<IActionPlanRepository>    ActionPlans,
        Mock<IAiPredictionRepository>  AiPredictions,
        Mock<IActionCatalogRepository> ActionCatalog,
        Mock<IModelVersionRepository>  ModelVersions,
        Mock<IEmployeeService>         EmployeeService,
        Mock<IMlPredictionClient>      MlClient,
        Mock<IEmployeeTaskRepository>  EmployeeTasks,
        Mock<IUnitOfWork>              Uow);

    private static (ActionPlanService Svc, Mocks M) Build()
    {
        var m = new Mocks(
            new Mock<IAssessmentRepository>(),
            new Mock<IActionPlanRepository>(),
            new Mock<IAiPredictionRepository>(),
            new Mock<IActionCatalogRepository>(),
            new Mock<IModelVersionRepository>(),
            new Mock<IEmployeeService>(),
            new Mock<IMlPredictionClient>(),
            new Mock<IEmployeeTaskRepository>(),
            new Mock<IUnitOfWork>());

        // Default UoW — everything is a no-op
        m.Uow.Setup(u => u.BeginTransactionAsync(default)).Returns(Task.CompletedTask);
        m.Uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);
        m.Uow.Setup(u => u.CommitAsync(default)).Returns(Task.CompletedTask);
        m.Uow.Setup(u => u.RollbackAsync(default)).Returns(Task.CompletedTask);

        var svc = new ActionPlanService(
            m.Assessments.Object,
            m.ActionPlans.Object,
            m.AiPredictions.Object,
            m.ActionCatalog.Object,
            m.ModelVersions.Object,
            m.EmployeeService.Object,
            m.MlClient.Object,
            m.EmployeeTasks.Object,
            m.Uow.Object);

        return (svc, m);
    }

    // ── Shared fakes ──────────────────────────────────────────────────────────

    private static Assessment MakeAssessment(int id = 1, int employeeId = 10) =>
        new() { Id = id, EmployeeId = employeeId, Status = AssessmentStatus.Completed };

    private static EmployeeFeatureDto MakeFeatures() => new()
    {
        Age = 30, Attrition = "No", BusinessTravel = "Travel_Rarely",
        Department = "Sales", DistanceFromHome = 5, Education = "3",
        EducationField = "Life Sciences", EnvironmentSatisfaction = 3,
        Gender = "Female", JobRole = "Sales Executive", JobSatisfaction = 4,
        MaritalStatus = "Single", WorkLifeBalance = 3,
        TotalWorkingYears = 8, YearsAtCompany = 5,
        YearsInCurrentRole = 3, YearsWithCurrManager = 2,
        PerformanceScore = 3.5,
        Core_Communication = 3.2, Core_Teamwork = 3.7, Core_ProblemSolving = 3.5,
        Core_Adaptability = 3.1, Core_Initiative = 3.0, Core_Accountability = 3.8,
        Core_LearningAgility = 3.4, Core_TimeManagement = 2.9,
        Dept_Comp1 = 3.5, Dept_Comp2 = 3.0, Dept_Comp3 = 3.6,
        Role_Comp1 = 3.4, Role_Comp2 = 3.1
    };

    private static MlPredictionResponse MakeMlResponse(int employeeId = 10, int count = 13)
    {
        var actions = Enumerable.Range(1, count)
            .Select(i => new MlRecommendedActionDto
            {
                Code        = $"ACTION_{i:D2}",
                Probability = 0.9 - i * 0.02,
                Selected    = true
            })
            .ToList();

        return new MlPredictionResponse
        {
            EmployeeId              = employeeId,
            RecommendedActions      = actions,
            TotalRecommendedActions = actions.Count
        };
    }

    private static ActionPlan MakePlan(
        int id          = 1,
        int employeeId  = 10,
        ActionPlanStatus status = ActionPlanStatus.Draft,
        int itemCount   = 3) => new()
    {
        Id              = id,
        EmployeeId      = employeeId,
        AssessmentId    = 1,
        CreatedByUserId = 2,
        Status          = status,
        Employee        = new Employee { Id = employeeId, FullName = "Test Employee" },
        CreatedByUser   = new User    { Id = 2, FullName = "HR User" },
        Items           = Enumerable.Range(1, itemCount).Select(i => new ActionPlanItem
        {
            Id          = i,
            ActionPlanId = id,
            Title       = $"Item {i}",
            Description = $"Desc {i}",
            Priority    = PriorityLevel.Medium,
            Source      = ActionPlanItemSource.AI,
            OrderNo     = i,
            IsDeleted   = false
        }).ToList()
    };

    // ── GenerateDraftActionPlanAsync ──────────────────────────────────────────

    [Fact]
    public async Task GenerateDraftActionPlanAsync_MlSuccess_CreatesDraftPlan()
    {
        var (svc, m) = Build();
        var assessment = MakeAssessment();
        var mlResponse = MakeMlResponse(count: 13);
        var plan       = MakePlan(itemCount: 13);

        m.Assessments.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(assessment);
        m.ActionPlans.Setup(r => r.GetActiveByAssessmentIdAsync(1)).ReturnsAsync((ActionPlan?)null);
        m.MlClient.Setup(c => c.IsHealthyAsync()).ReturnsAsync(true);
        m.EmployeeService.Setup(s => s.GetEmployeeFeaturesForPredictionAsync(assessment.EmployeeId, 1))
                         .ReturnsAsync(MakeFeatures());
        m.ModelVersions.Setup(r => r.GetActiveAsync()).ReturnsAsync(new ModelVersion { Id = 1, IsActive = true });
        m.MlClient.Setup(c => c.PredictActionsTopKAsync(It.IsAny<MlPredictionRequest>(), It.IsAny<int>()))
                  .ReturnsAsync(mlResponse);
        m.AiPredictions.Setup(r => r.AddRunAsync(It.IsAny<AiPredictionRun>())).Returns(Task.CompletedTask);
        m.AiPredictions.Setup(r => r.AddPredictedActionsAsync(It.IsAny<IEnumerable<AiPredictedAction>>()))
                       .Returns(Task.CompletedTask);
        m.ActionCatalog.Setup(r => r.GetByCodesAsync(It.IsAny<IEnumerable<string>>()))
                       .ReturnsAsync(Enumerable.Empty<ActionCatalog>());
        m.ActionPlans.Setup(r => r.AddAsync(It.IsAny<ActionPlan>())).Returns(Task.CompletedTask);
        m.ActionPlans.Setup(r => r.AddItemAsync(It.IsAny<ActionPlanItem>())).Returns(Task.CompletedTask);
        m.ActionPlans.Setup(r => r.GetByIdWithItemsAsync(It.IsAny<int>())).ReturnsAsync(plan);

        var result = await svc.GenerateDraftActionPlanAsync(
            new GenerateActionPlanRequest { AssessmentId = 1, TopK = 13 }, requestingUserId: 2);

        result.Should().NotBeNull();
        result.Items.Should().HaveCount(13);
        m.ActionPlans.Verify(r => r.AddAsync(It.IsAny<ActionPlan>()), Times.Once);
        m.Uow.Verify(u => u.CommitAsync(default), Times.Once);
    }

    [Fact]
    public async Task GenerateDraftActionPlanAsync_MlServiceUnhealthy_ThrowsInvalidOperation()
    {
        var (svc, m) = Build();

        m.Assessments.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(MakeAssessment());
        m.ActionPlans.Setup(r => r.GetActiveByAssessmentIdAsync(1)).ReturnsAsync((ActionPlan?)null);
        m.MlClient.Setup(c => c.IsHealthyAsync()).ReturnsAsync(false);

        await svc.Invoking(s => s.GenerateDraftActionPlanAsync(
                new GenerateActionPlanRequest { AssessmentId = 1, TopK = 13 }, 2))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*ML servisi hazır değil*");
    }

    [Fact]
    public async Task GenerateDraftActionPlanAsync_DuplicatePlan_ThrowsArgumentException()
    {
        var (svc, m) = Build();

        m.Assessments.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(MakeAssessment());
        m.ActionPlans.Setup(r => r.GetActiveByAssessmentIdAsync(1)).ReturnsAsync(MakePlan());

        await svc.Invoking(s => s.GenerateDraftActionPlanAsync(
                new GenerateActionPlanRequest { AssessmentId = 1, TopK = 13 }, 2))
            .Should().ThrowAsync<ArgumentException>()
            .WithMessage("*zaten aktif*");
    }

    [Fact]
    public async Task GenerateDraftActionPlanAsync_MlThrows_RunSavedAsFailed()
    {
        var (svc, m) = Build();
        AiPredictionRun? capturedRun = null;

        m.Assessments.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(MakeAssessment());
        m.ActionPlans.Setup(r => r.GetActiveByAssessmentIdAsync(1)).ReturnsAsync((ActionPlan?)null);
        m.MlClient.Setup(c => c.IsHealthyAsync()).ReturnsAsync(true);
        m.EmployeeService.Setup(s => s.GetEmployeeFeaturesForPredictionAsync(It.IsAny<int>(), It.IsAny<int>()))
                         .ReturnsAsync(MakeFeatures());
        m.ModelVersions.Setup(r => r.GetActiveAsync()).ReturnsAsync(new ModelVersion { Id = 1 });
        m.MlClient.Setup(c => c.PredictActionsTopKAsync(It.IsAny<MlPredictionRequest>(), It.IsAny<int>()))
                  .ThrowsAsync(new HttpRequestException("ML down"));
        m.AiPredictions.Setup(r => r.AddRunAsync(It.IsAny<AiPredictionRun>()))
                       .Callback<AiPredictionRun>(r => capturedRun = r)
                       .Returns(Task.CompletedTask);

        await svc.Invoking(s => s.GenerateDraftActionPlanAsync(
                new GenerateActionPlanRequest { AssessmentId = 1, TopK = 13 }, 2))
            .Should().ThrowAsync<HttpRequestException>();

        capturedRun.Should().NotBeNull();
        capturedRun!.Status.Should().Be(PredictionRunStatus.Failed);
        capturedRun.ErrorMessage.Should().NotBeNullOrEmpty();
    }

    // ── ApproveActionPlanAsync ────────────────────────────────────────────────

    [Fact]
    public async Task ApproveActionPlanAsync_EmptyPlan_ThrowsArgumentException()
    {
        var (svc, m) = Build();
        var emptyPlan = MakePlan(itemCount: 0);
        emptyPlan.Status = ActionPlanStatus.Draft;

        m.ActionPlans.Setup(r => r.GetByIdWithItemsAsync(1)).ReturnsAsync(emptyPlan);

        await svc.Invoking(s => s.ApproveActionPlanAsync(1, 2))
                 .Should().ThrowAsync<ArgumentException>()
                 .WithMessage("*Boş plan*");
    }

    [Fact]
    public async Task ApproveActionPlanAsync_ValidPlan_SetsApprovedStatus()
    {
        var (svc, m) = Build();
        var plan = MakePlan(itemCount: 3);
        plan.Status = ActionPlanStatus.Draft;

        m.ActionPlans.Setup(r => r.GetByIdWithItemsAsync(1)).ReturnsAsync(plan);
        m.ActionPlans.Setup(r => r.Update(It.IsAny<ActionPlan>()));
        // Second call inside GetActionPlanByIdAsync
        m.ActionPlans.Setup(r => r.GetByIdWithItemsAsync(It.IsAny<int>())).ReturnsAsync(plan);

        var result = await svc.ApproveActionPlanAsync(1, 2);

        plan.Status.Should().Be(ActionPlanStatus.Approved);
        plan.ApprovedAt.Should().NotBeNull();
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task ApproveActionPlanAsync_AlreadyApproved_ReturnsCurrentPlan()
    {
        var (svc, m) = Build();
        var plan = MakePlan(itemCount: 3);
        plan.Status     = ActionPlanStatus.Approved;
        plan.ApprovedAt = DateTime.UtcNow.AddMinutes(-5);

        m.ActionPlans.Setup(r => r.GetByIdWithItemsAsync(It.IsAny<int>())).ReturnsAsync(plan);

        var result = await svc.ApproveActionPlanAsync(1, 2);

        result.Should().NotBeNull();
        result.Status.Should().Be("Approved");
        // Update should NOT be called — idempotent return
        m.ActionPlans.Verify(r => r.Update(It.IsAny<ActionPlan>()), Times.Never);
    }

    // ── SendActionPlanToEmployeeAsync ─────────────────────────────────────────

    [Fact]
    public async Task SendActionPlanToEmployeeAsync_AlreadySent_NoDuplicateTasks()
    {
        var (svc, m) = Build();
        var plan = MakePlan(itemCount: 2);
        plan.Status = ActionPlanStatus.Sent;
        plan.SentAt = DateTime.UtcNow.AddMinutes(-10);

        m.ActionPlans.Setup(r => r.GetByIdWithItemsAsync(It.IsAny<int>())).ReturnsAsync(plan);

        var result = await svc.SendActionPlanToEmployeeAsync(1, 2);

        result.Should().NotBeNull();
        // BeginTransaction should NOT be called — returns early
        m.Uow.Verify(u => u.BeginTransactionAsync(default), Times.Never);
        m.EmployeeTasks.Verify(r => r.AddAsync(It.IsAny<EmployeeTask>()), Times.Never);
    }

    // ── UpdateActionPlanItemAsync ─────────────────────────────────────────────

    [Fact]
    public async Task UpdateActionPlanItemAsync_AiSource_BecomesEditedAI()
    {
        var (svc, m) = Build();
        var plan = MakePlan(id: 1, itemCount: 0);
        var item = new ActionPlanItem
        {
            Id           = 5,
            ActionPlanId = 1,
            Title        = "Original",
            Description  = "Desc",
            Priority     = PriorityLevel.Medium,
            Source       = ActionPlanItemSource.AI,
            OrderNo      = 1,
            IsDeleted    = false
        };

        m.ActionPlans.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(plan);
        m.ActionPlans.Setup(r => r.GetItemByIdAsync(5)).ReturnsAsync(item);
        m.ActionPlans.Setup(r => r.UpdateItem(It.IsAny<ActionPlanItem>()));

        var result = await svc.UpdateActionPlanItemAsync(1, 5,
            new UpdateActionPlanItemRequest { Title = "Updated Title", OrderNo = 1 });

        item.Source.Should().Be(ActionPlanItemSource.EditedAI);
        result.Source.Should().Be("EditedAI");
        result.Title.Should().Be("Updated Title");
    }
}
