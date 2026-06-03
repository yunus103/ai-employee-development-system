using BitirmeBackend.Domain.Entities;

namespace BitirmeBackend.Application.Interfaces.Repositories;

public interface IEmployeeRepository
{
    Task<(IEnumerable<Employee> Items, int TotalCount)> GetPagedAsync(int pageNumber, int pageSize);
    Task<Employee?> GetByIdAsync(int id);
    Task<Employee?> GetByIdWithDetailsAsync(int id);
    Task<Employee?> GetByCodeAsync(string employeeCode);
    Task<bool> ExistsByCodeAsync(string employeeCode);
    Task AddAsync(Employee employee);
    void Update(Employee employee);
}
