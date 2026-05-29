namespace QAQuest.Api.Dtos;

public class PracticeRunRequest
{
    public int ProblemId { get; set; }
    public string Code { get; set; } = "";
    /// <summary>Optional: run tests from this solution row. When null, the first C# row for the problem is used (legacy).</summary>
    public int? SolutionId { get; set; }
    /// <summary>full = NUnitTestsCode, sample = NUnitSampleTestsCode when set, else falls back to full tests (same as previous behavior if sample not populated).</summary>
    public string TestScope { get; set; } = "full";

    /// <summary>When set, this NUnit source is used for the run (same as the practice editor). Otherwise tests are loaded from the solution row in the database.</summary>
    public string? NUnitTestsCode { get; set; }
}
