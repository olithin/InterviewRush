namespace QAQuest.Api.Models;

public class ProblemSolution
{
    public int Id { get; set; }
    public int ProblemId { get; set; }
    public Problem? Problem { get; set; }

    public string Language { get; set; } = "C#";
    public string? Label { get; set; }
    public string SolutionCode { get; set; } = string.Empty;
    /// <summary>Full / hidden NUnit. Used when TestScope is "full" or when sample is empty.</summary>
    public string NUnitTestsCode { get; set; } = string.Empty;
    /// <summary>Subset for quick runs. When empty, sample runs use the same tests as full (until content fills this).</summary>
    public string NUnitSampleTestsCode { get; set; } = string.Empty;
    public string? ThinkPattern { get; set; }
    public string? ThinkIdea { get; set; }
    public string? ThinkComplexity { get; set; }
}
