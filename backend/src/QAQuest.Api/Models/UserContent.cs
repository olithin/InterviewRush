namespace QAQuest.Api.Models;

/// <summary>
/// Per-user personal answer and notes for a single interview question or problem.
/// UserId is the user's email from the NextAuth session, trusted at MVP level.
/// </summary>
public class UserContent
{
    public int Id { get; set; }

    /// <summary>Email from the NextAuth session (X-User-Id header).</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>"interview-question" or "problem".</summary>
    public string ItemType { get; set; } = string.Empty;

    public int ItemId { get; set; }

    public string MyAnswer { get; set; } = string.Empty;

    public string MyNotes { get; set; } = string.Empty;

    public DateTime UpdatedAtUtc { get; set; }
}
