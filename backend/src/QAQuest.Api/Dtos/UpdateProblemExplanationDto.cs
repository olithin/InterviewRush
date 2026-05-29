namespace QAQuest.Api.Dtos;

public class UpdateProblemExplanationDto
{
    public string Pattern { get; set; } = string.Empty;
    public List<string> WordingSignals { get; set; } = new();
    public string Mnemonic { get; set; } = string.Empty;
    public string HowToThink { get; set; } = string.Empty;
    public List<string> HowToThinkSteps { get; set; } = new();
    public string BruteForceIdea { get; set; } = string.Empty;
    public string OptimalIdea { get; set; } = string.Empty;
    public List<string> StepByStepAlgorithm { get; set; } = new();
    public string VisualExplanation { get; set; } = string.Empty;
    public string WhyThisPattern { get; set; } = string.Empty;
    public List<string> WhyNotOtherPatterns { get; set; } = new();
    public string Complexity { get; set; } = string.Empty;
    public List<string> EdgeCaseChecklist { get; set; } = new();
    public UpdateCommonMistakesDto CommonMistakes { get; set; } = new();
    public List<string> GapLearningHints { get; set; } = new();
    public string InterviewExplanationEnglish { get; set; } = string.Empty;
    public string SimpleExplanationRussian { get; set; } = string.Empty;

    public string MentalModelTrigger { get; set; } = string.Empty;
    public string MentalModelCue { get; set; } = string.Empty;
    public string MentalModelScript { get; set; } = string.Empty;
    public string MentalModelTrap { get; set; } = string.Empty;
    public string MentalModelPersonalWords { get; set; } = string.Empty;
    public string MentalModelInterviewPhrase { get; set; } = string.Empty;
}

public class UpdateCommonMistakesDto
{
    public List<string> Critical { get; set; } = new();
    public List<string> Important { get; set; } = new();
    public List<string> NiceToHave { get; set; } = new();
}
