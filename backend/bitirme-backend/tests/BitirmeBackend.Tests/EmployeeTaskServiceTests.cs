using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Application.Services;
using BitirmeBackend.Domain.Entities;
using BitirmeBackend.Domain.Enums;
using FluentAssertions;
using Moq;

namespace BitirmeBackend.Tests;

public class EmployeeTaskServiceTests
{
    private static EmployeeTaskService Build(
        Mock<IEmployeeTaskRepository> repo, Mock<IUnitOfWork>? uow = null)
    {
        uow ??= new Mock<IUnitOfWork>();
        uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);
        return new EmployeeTaskService(repo.Object, uow.Object);
    }

    private static EmployeeTask MakeTask(
        int taskId      = 1,
        int employeeId  = 10,
        EmployeeTaskStatus status = EmployeeTaskStatus.Assigned) => new()
    {
        Id               = taskId,
        EmployeeId       = employeeId,
        AssignedByUserId = 2,
        Status           = status,
        AssignedAt       = DateTime.UtcNow.AddDays(-1),
        ActionPlanItem   = new ActionPlanItem { Id = 1, Title = "Test Task", Priority = PriorityLevel.Medium },
        Employee         = new Employee { Id = employeeId, FullName = "Test Employee" },
        AssignedByUser   = new User { Id = 2, FullName = "HR User" }
    };

    // ── UpdateTaskStatusAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task UpdateTaskStatusAsync_AssignedToInProgress_Succeeds()
    {
        var repo = new Mock<IEmployeeTaskRepository>();
        var task = MakeTask(status: EmployeeTaskStatus.Assigned);
        repo.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(task);
        repo.Setup(r => r.Update(It.IsAny<EmployeeTask>()));

        var svc    = Build(repo);
        var result = await svc.UpdateTaskStatusAsync(1, employeeId: 10, EmployeeTaskStatus.InProgress);

        result.Status.Should().Be("InProgress");
        task.Status.Should().Be(EmployeeTaskStatus.InProgress);
        task.CompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task UpdateTaskStatusAsync_InProgressToCompleted_SetsCompletedAt()
    {
        var repo = new Mock<IEmployeeTaskRepository>();
        var task = MakeTask(status: EmployeeTaskStatus.InProgress);
        repo.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(task);
        repo.Setup(r => r.Update(It.IsAny<EmployeeTask>()));

        var before = DateTime.UtcNow;
        var svc    = Build(repo);
        var result = await svc.UpdateTaskStatusAsync(1, employeeId: 10, EmployeeTaskStatus.Completed);

        result.Status.Should().Be("Completed");
        task.CompletedAt.Should().NotBeNull();
        task.CompletedAt!.Value.Should().BeOnOrAfter(before);
    }

    [Fact]
    public async Task UpdateTaskStatusAsync_InProgressToAssigned_ThrowsArgumentException()
    {
        var repo = new Mock<IEmployeeTaskRepository>();
        var task = MakeTask(status: EmployeeTaskStatus.InProgress);
        repo.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(task);

        var svc = Build(repo);
        await svc.Invoking(s => s.UpdateTaskStatusAsync(1, employeeId: 10, EmployeeTaskStatus.Assigned))
                 .Should().ThrowAsync<ArgumentException>()
                 .WithMessage("*Geçersiz durum geçişi*");
    }

    [Fact]
    public async Task UpdateTaskStatusAsync_WrongEmployee_ThrowsUnauthorized()
    {
        var repo = new Mock<IEmployeeTaskRepository>();
        var task = MakeTask(employeeId: 10);  // task belongs to employee 10
        repo.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(task);

        var svc = Build(repo);
        await svc.Invoking(s => s.UpdateTaskStatusAsync(1, employeeId: 99, EmployeeTaskStatus.InProgress))
                 .Should().ThrowAsync<UnauthorizedAccessException>()
                 .WithMessage("*erişim yetkiniz yok*");
    }
}
