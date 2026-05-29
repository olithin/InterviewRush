namespace QAQuest.Api.Models;

/// <summary>
/// A non-coding interview question (behavioral, language, system design text, etc.).
/// </summary>
public class InterviewQuestion
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Difficulty { get; set; } = "Easy";
    /// <summary>Pipe-separated list in DB, same convention as problem explanations.</summary>
    public string Tags { get; set; } = string.Empty;
    public string AnswerEnglish { get; set; } = string.Empty;
    public string AnswerRussian { get; set; } = string.Empty;
    public string MemoryCue { get; set; } = string.Empty;
    public string CommonTrap { get; set; } = string.Empty;
    /// <summary>Pipe-separated follow-up prompts in DB.</summary>
    public string FollowUpQuestions { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
