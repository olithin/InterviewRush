namespace QAQuest.Api.Dtos;

public class CreateSolutionTemplateDto
{
    public string? Label { get; set; }
    public string SolutionCode { get; set; } = string.Empty;
    /// <summary>Required only when the problem has no other solutions yet (so tests can be copied from an existing row).</summary>
    public string? NUnitTestsCode { get; set; }
    public string? NUnitSampleTestsCode { get; set; }
    public string? ThinkPattern { get; set; }
    public string? ThinkIdea { get; set; }
    public string? ThinkComplexity { get; set; }
}

public class UpdateSolutionTemplateDto
{
    public string? Label { get; set; }
    public string? SolutionCode { get; set; }
    public string? NUnitTestsCode { get; set; }
    public string? NUnitSampleTestsCode { get; set; }
    public string? ThinkPattern { get; set; }
    public string? ThinkIdea { get; set; }
    public string? ThinkComplexity { get; set; }
}
