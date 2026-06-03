using BitirmeBackend.Contracts.Dtos;
using BitirmeBackend.Infrastructure.ExternalServices;
using FluentAssertions;

namespace BitirmeBackend.Tests;

public class FakeMlPredictionClientTests
{
    private readonly FakeMlPredictionClient _client = new();

    [Fact]
    public async Task PredictActionsTopKAsync_Returns13Actions()
    {
        var request = new MlPredictionRequest { EmployeeId = 1, Features = [] };
        var result  = await _client.PredictActionsTopKAsync(request, k: 13);

        result.Should().NotBeNull();
        result.RecommendedActions.Should().HaveCount(13);
        result.TotalRecommendedActions.Should().Be(13);
    }

    [Fact]
    public async Task IsHealthyAsync_ReturnsTrue()
    {
        var result = await _client.IsHealthyAsync();
        result.Should().BeTrue();
    }

    [Fact]
    public async Task PredictActionsTopKAsync_AllActionsHaveNonZeroProbability()
    {
        var request = new MlPredictionRequest { EmployeeId = 1, Features = [] };
        var result  = await _client.PredictActionsTopKAsync(request, k: 13);

        result.RecommendedActions.Should().AllSatisfy(a => a.Probability.Should().BeGreaterThan(0));
    }
}
