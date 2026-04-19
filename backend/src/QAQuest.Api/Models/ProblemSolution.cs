namespace QAQuest.Api.Models;

public class ProblemSolution
{
    public int Id { get; set; }
    public int ProblemId { get; set; }
    public Problem? Problem { get; set; }

    public string Language { get; set; } = "C#";
    public string SolutionCode { get; set; } = string.Empty;
    public string NUnitTestsCode { get; set; } = string.Empty;
}
