using BitirmeBackend.Application.Interfaces;
using BitirmeBackend.Contracts.Dtos;

namespace BitirmeBackend.Infrastructure.ExternalServices;

/// <summary>
/// ONLY for Development / Demo environments.
/// NEVER register this implementation in Production — use the real MlPredictionClient instead.
/// Returns 13 hardcoded action recommendations so the full action-plan flow can be
/// demonstrated without a running FastAPI ML service.
/// </summary>
public class FakeMlPredictionClient : IMlPredictionClient
{
    private static readonly IReadOnlyList<MlRecommendedActionDto> _fakeActions =
    [
        new MlRecommendedActionDto { Code = "DEPT_COMP1_03", Probability = 0.93, Selected = true },
        new MlRecommendedActionDto { Code = "ROLE_COMP1_03", Probability = 0.89, Selected = true },
        new MlRecommendedActionDto { Code = "ROLE_COMP2_03", Probability = 0.85, Selected = true },
        new MlRecommendedActionDto { Code = "DEPT_COMP3_03", Probability = 0.82, Selected = true },
        new MlRecommendedActionDto { Code = "CORE_ACCT_04",  Probability = 0.78, Selected = true },
        new MlRecommendedActionDto { Code = "CORE_INIT_03",  Probability = 0.75, Selected = true },
        new MlRecommendedActionDto { Code = "CORE_TIME_03",  Probability = 0.71, Selected = true },
        new MlRecommendedActionDto { Code = "DEPT_COMP2_03", Probability = 0.68, Selected = true },
        new MlRecommendedActionDto { Code = "CORE_COMM_03",  Probability = 0.64, Selected = true },
        new MlRecommendedActionDto { Code = "CORE_LEARN_04", Probability = 0.61, Selected = true },
        new MlRecommendedActionDto { Code = "CORE_TEAM_04",  Probability = 0.58, Selected = true },
        new MlRecommendedActionDto { Code = "CORE_ADAPT_03", Probability = 0.54, Selected = true },
        new MlRecommendedActionDto { Code = "CORE_PROB_04",  Probability = 0.51, Selected = true },
    ];

    public Task<MlPredictionResponse> PredictActionsTopKAsync(MlPredictionRequest request, int k = 13)
    {
        var actions = _fakeActions.Take(k).ToList();
        var response = new MlPredictionResponse
        {
            EmployeeId = request.EmployeeId,
            RecommendedActions = actions,
            TotalRecommendedActions = actions.Count
        };
        return Task.FromResult(response);
    }

    /// <summary>Always reports healthy — no real service dependency.</summary>
    public Task<bool> IsHealthyAsync() => Task.FromResult(true);
}
