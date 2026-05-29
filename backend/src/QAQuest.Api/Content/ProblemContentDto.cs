namespace QAQuest.Api.Content;

public sealed class ProblemContentDto
{
    public int Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string Pattern { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "Easy";
    public string Statement { get; set; } = string.Empty;
    public string[] Signals { get; set; } = [];
    public string Mnemonic { get; set; } = string.Empty;
    public string[] Think { get; set; } = [];
    public string[] Algorithm { get; set; } = [];
    public string Code { get; set; } = string.Empty;
    public string Tests { get; set; } = string.Empty;
    public string Interview { get; set; } = string.Empty;
    public string Ru { get; set; } = string.Empty;
    public string VisualExplanation { get; set; } = string.Empty;
    public ProblemMistakesDto Mistakes { get; set; } = new();
    public string[] Gaps { get; set; } = [];
    public string[] EdgeCases { get; set; } = [];

    public int? SortOrder { get; set; }
    public string? Status { get; set; }
    public string[]? Examples { get; set; }
    public string? Constraints { get; set; }

    public string? WhyThisPattern { get; set; }
    public string[]? WhyNotOtherPatterns { get; set; }
}

public sealed class ProblemMistakesDto
{
    public string[] Critical { get; set; } = [];
    public string[] Important { get; set; } = [];
    public string[] Nice { get; set; } = [];
}
