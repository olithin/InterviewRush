namespace QAQuest.Api.Models;

public class Problem
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "Easy";
    public string ProblemStatement { get; set; } = string.Empty;

    public int TopicId { get; set; }
    public Topic? Topic { get; set; }

    public ProblemExplanation? Explanation { get; set; }
    public ICollection<ProblemSolution> Solutions { get; set; } = new List<ProblemSolution>();
    public ICollection<Attempt> Attempts { get; set; } = new List<Attempt>();
}
