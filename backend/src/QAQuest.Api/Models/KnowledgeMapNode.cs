namespace QAQuest.Api.Models;

/// <summary>
/// Hierarchical knowledge map node used to structure interview topics into a tree.
/// One <see cref="MapKey"/> = one map. The root node has <see cref="ParentId"/> = null.
/// </summary>
public class KnowledgeMapNode
{
    public int Id { get; set; }
    public string MapKey { get; set; } = "default";
    public int? ParentId { get; set; }
    public KnowledgeMapNode? Parent { get; set; }
    public ICollection<KnowledgeMapNode> Children { get; set; } = new List<KnowledgeMapNode>();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>Optional link to an interview question (leaf shortcut to coach).</summary>
    public int? InterviewQuestionId { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
