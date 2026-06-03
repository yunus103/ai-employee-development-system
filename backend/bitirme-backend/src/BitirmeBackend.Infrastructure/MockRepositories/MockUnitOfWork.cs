using BitirmeBackend.Application.Interfaces.Repositories;

namespace BitirmeBackend.Infrastructure.MockRepositories;

/// <summary>
/// No-op unit of work for mock/in-memory usage.
/// SaveChangesAsync is a no-op because mock repositories mutate the shared
/// in-memory lists directly; transaction methods are also no-ops.
/// </summary>
public class MockUnitOfWork : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(0);

    public Task BeginTransactionAsync(CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task CommitAsync(CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task RollbackAsync(CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public void Dispose() { /* nothing to dispose */ }
}
