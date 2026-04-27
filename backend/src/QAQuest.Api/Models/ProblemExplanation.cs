namespace QAQuest.Api.Models;

public class ProblemExplanation
{
    public int Id { get; set; }
    public int ProblemId { get; set; }
    public Problem? Problem { get; set; }

    public string Pattern { get; set; } = string.Empty;
    public string WordingSignals { get; set; } = string.Empty;
    public string Mnemonic { get; set; } = string.Empty;
    public string PatternSignals { get; set; } = string.Empty;
    public string HowToThink { get; set; } = string.Empty;
    public string HowToThinkSteps { get; set; } = string.Empty;
    public string BruteForceIdea { get; set; } = string.Empty;
    public string OptimalIdea { get; set; } = string.Empty;
    public string StepByStepAlgorithm { get; set; } = string.Empty;
    public string VisualExplanation { get; set; } = string.Empty;
    public string WhyThisWorks { get; set; } = string.Empty;
    public string WhyNotOtherPatterns { get; set; } = string.Empty;
    public string Complexity { get; set; } = string.Empty;
    public string CommonMistakes { get; set; } = string.Empty;
    public string CommonMistakesCritical { get; set; } = string.Empty;
    public string CommonMistakesImportant { get; set; } = string.Empty;
    public string CommonMistakesNiceToHave { get; set; } = string.Empty;
    public string EdgeCaseChecklist { get; set; } = string.Empty;
    public string GapLearningHints { get; set; } = string.Empty;
    public string EnglishInterviewExplanation { get; set; } = string.Empty;
    public string RussianShortExplanation { get; set; } = string.Empty;

    /// <summary>Coach mental model: what in the statement suggests the pattern (e.g. "sorted + search").</summary>
    public string MentalModelTrigger { get; set; } = string.Empty;
    public string MentalModelCue { get; set; } = string.Empty;
    public string MentalModelScript { get; set; } = string.Empty;
    public string MentalModelTrap { get; set; } = string.Empty;
    public string MentalModelPersonalWords { get; set; } = string.Empty;
    public string MentalModelInterviewPhrase { get; set; } = string.Empty;
}
