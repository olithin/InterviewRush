namespace QAQuest.Api.Models;

public class Gap
{
    public int Id { get; set; }
    public int TopicId { get; set; }
    public Topic? Topic { get; set; }

    public int Severity { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
