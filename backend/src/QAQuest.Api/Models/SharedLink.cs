namespace QAQuest.Api.Models;

/// <summary>
/// A read-only share token for one or all user-content records belonging to an owner.
/// </summary>
public class SharedLink
{
    /// <summary>Cryptographically-random URL-safe token (32 chars).</summary>
    public string Token { get; set; } = string.Empty;

    public string OwnerUserId { get; set; } = string.Empty;

    /// <summary>"interview-question" or "problem".</summary>
    public string ItemType { get; set; } = string.Empty;

    /// <summary>0 = share all items of this type; positive = single item.</summary>
    public int ItemId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    /// <summary>Null = never expires.</summary>
    public DateTime? ExpiresAtUtc { get; set; }
}
