using BitirmeBackend.Contracts.Common;
using BitirmeBackend.Contracts.Requests;
using BitirmeBackend.Contracts.Responses;

namespace BitirmeBackend.Application.Interfaces.Services;

public interface IEmployeeService
{
    Task<PagedResponse<EmployeeListItemDto>> GetEmployeesAsync(int pageNumber, int pageSize);
    Task<EmployeeDetailDto> GetEmployeeByIdAsync(int id);
    Task<EmployeeDetailDto> CreateEmployeeAsync(CreateEmployeeRequest request);
    Task<EmployeeDetailDto> UpdateEmployeeAsync(int id, UpdateEmployeeRequest request);

    /// <summary>
    /// Builds EmployeeFeatureDto from Employee base fields + Assessment.OverallScore
    /// + AssessmentScore records mapped by Competency.Code.
    /// Throws if any required feature is missing (caller should return 400 with missingFeatures).
    /// </summary>
    Task<EmployeeFeatureDto> GetEmployeeFeaturesForPredictionAsync(int employeeId, int assessmentId);
}
