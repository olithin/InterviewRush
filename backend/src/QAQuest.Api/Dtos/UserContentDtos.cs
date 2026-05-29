namespace QAQuest.Api.Dtos;

public class UpsertUserContentRequest
{
    public string? MyAnswer { get; set; }
    public string? MyNotes { get; set; }
}

public class CreateSharedLinkRequest
{
    public string ItemType { get; set; } = string.Empty;
    /// <summary>0 = share all items of this type; positive = single item.</summary>
    public int ItemId { get; set; }
}
