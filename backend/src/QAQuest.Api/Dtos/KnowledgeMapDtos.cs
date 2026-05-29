namespace QAQuest.Api.Dtos;

public class KnowledgeMapNodeDto
{
    public int Id { get; set; }
    public string MapKey { get; set; } = string.Empty;
    public int? ParentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int? InterviewQuestionId { get; set; }
    public int SortOrder { get; set; }
    public IReadOnlyList<KnowledgeMapNodeDto> Children { get; set; } = Array.Empty<KnowledgeMapNodeDto>();
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class CreateKnowledgeMapNodeRequest
{
    public string MapKey { get; set; } = "default";
    public int? ParentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? InterviewQuestionId { get; set; }
    public int? SortOrder { get; set; }
}

public class UpdateKnowledgeMapNodeRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? InterviewQuestionId { get; set; }
    public int? SortOrder { get; set; }
}

public class MoveKnowledgeMapNodeRequest
{
    /// <summary>New parent id; pass null to make the node a root of its map.</summary>
    public int? ParentId { get; set; }
    /// <summary>0-based position among new siblings; if null, append to the end.</summary>
    public int? Position { get; set; }
}
