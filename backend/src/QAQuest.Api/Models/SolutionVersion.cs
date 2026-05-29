using System.ComponentModel.DataAnnotations.Schema;

namespace QAQuest.Api.Models;

[Table("SolutionVersions")]
public class SolutionVersion
{
    public int Id { get; set; }
    public int ProblemSolutionId { get; set; }
    public ProblemSolution? ProblemSolution { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string SolutionCode { get; set; } = string.Empty;
    public string? ThinkPattern { get; set; }
    public string? ThinkIdea { get; set; }
    public string? ThinkComplexity { get; set; }
}
