namespace QAQuest.Api.Dtos;

public class InterviewQuestionDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public IReadOnlyList<string> Tags { get; set; } = Array.Empty<string>();
    public string AnswerEnglish { get; set; } = string.Empty;
    public string AnswerRussian { get; set; } = string.Empty;
    public string MemoryCue { get; set; } = string.Empty;
    public string CommonTrap { get; set; } = string.Empty;
    public IReadOnlyList<string> FollowUpQuestions { get; set; } = Array.Empty<string>();
    public string Notes { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class CreateInterviewQuestionRequest
{
    public string Title { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Difficulty { get; set; }
    public IReadOnlyList<string>? Tags { get; set; }
    public string? AnswerEnglish { get; set; }
    public string? AnswerRussian { get; set; }
    public string? MemoryCue { get; set; }
    public string? CommonTrap { get; set; }
    public IReadOnlyList<string>? FollowUpQuestions { get; set; }
    public string? Notes { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsPublished { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateInterviewQuestionRequest
{
    public string Title { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Difficulty { get; set; }
    public IReadOnlyList<string>? Tags { get; set; }
    public string? AnswerEnglish { get; set; }
    public string? AnswerRussian { get; set; }
    public string? MemoryCue { get; set; }
    public string? CommonTrap { get; set; }
    public IReadOnlyList<string>? FollowUpQuestions { get; set; }
    public string? Notes { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsPublished { get; set; }
    public bool? IsActive { get; set; }
}

public class BulkCreateInterviewQuestionsRequest
{
    public IReadOnlyList<CreateInterviewQuestionRequest> Items { get; set; } = Array.Empty<CreateInterviewQuestionRequest>();
}

public class BulkCreateInterviewQuestionsResult
{
    public IReadOnlyList<CreatedInterviewQuestionRef> Created { get; set; } = Array.Empty<CreatedInterviewQuestionRef>();
    public IReadOnlyList<BulkItemFailure> Failed { get; set; } = Array.Empty<BulkItemFailure>();
}

public class CreatedInterviewQuestionRef
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
}

public class BulkItemFailure
{
    public int Index { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class ReorderInterviewQuestionsRequest
{
    public IReadOnlyList<ReorderInterviewQuestionItem> Items { get; set; } = Array.Empty<ReorderInterviewQuestionItem>();
}

public class ReorderInterviewQuestionItem
{
    public int Id { get; set; }
    public int SortOrder { get; set; }
}
