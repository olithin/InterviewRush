namespace QAQuest.Api.Models;

public class ProblemExplanation
{
    public int Id { get; set; }
    public int ProblemId { get; set; }
    public Problem? Problem { get; set; }

    public string Pattern { get; set; } = string.Empty;
    public string WordingSignals { get; set; } = string.Empty;
    public string HowToThink { get; set; } = string.Empty;
    public string BruteForceIdea { get; set; } = string.Empty;
    public string OptimalIdea { get; set; } = string.Empty;
    public string StepByStepAlgorithm { get; set; } = string.Empty;
    public string WhyThisWorks { get; set; } = string.Empty;
    public string Complexity { get; set; } = string.Empty;
    public string CommonMistakes { get; set; } = string.Empty;
    public string EnglishInterviewExplanation { get; set; } = string.Empty;
    public string RussianShortExplanation { get; set; } = string.Empty;
}
