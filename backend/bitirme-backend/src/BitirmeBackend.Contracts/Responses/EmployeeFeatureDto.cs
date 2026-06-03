namespace BitirmeBackend.Contracts.Responses;

/// <summary>
/// Exactly 33 feature fields that FastAPI ML service expects.
/// Produced from: Employee base fields + Assessment.OverallScore + AssessmentScore/Competency mapping.
/// Do NOT add these as columns on the Employee entity.
/// </summary>
public class EmployeeFeatureDto
{
    // --- Employee base fields ---
    public int Age { get; set; }
    public string Attrition { get; set; } = string.Empty;
    public string BusinessTravel { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public int DistanceFromHome { get; set; }
    public string Education { get; set; } = string.Empty;
    public string EducationField { get; set; } = string.Empty;
    public int EnvironmentSatisfaction { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string JobRole { get; set; } = string.Empty;
    public int JobSatisfaction { get; set; }
    public string MaritalStatus { get; set; } = string.Empty;
    public int WorkLifeBalance { get; set; }
    public int TotalWorkingYears { get; set; }
    public int YearsAtCompany { get; set; }
    public int YearsInCurrentRole { get; set; }
    public int YearsWithCurrManager { get; set; }

    // --- Assessment field ---
    public double PerformanceScore { get; set; }

    // --- AssessmentScore / Competency mapping ---
    public double Core_Communication { get; set; }
    public double Core_Teamwork { get; set; }
    public double Core_ProblemSolving { get; set; }
    public double Core_Adaptability { get; set; }
    public double Core_Initiative { get; set; }
    public double Core_Accountability { get; set; }
    public double Core_LearningAgility { get; set; }
    public double Core_TimeManagement { get; set; }
    public double Dept_Comp1 { get; set; }
    public double Dept_Comp2 { get; set; }
    public double Dept_Comp3 { get; set; }
    public double Role_Comp1 { get; set; }
    public double Role_Comp2 { get; set; }
}
