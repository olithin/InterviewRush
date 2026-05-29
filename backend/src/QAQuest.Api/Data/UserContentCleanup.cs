using Microsoft.EntityFrameworkCore;

namespace QAQuest.Api.Data;

/// <summary>
/// When a catalog item (interview question or problem) is removed, personal data and
/// single-item share links for that id must go too. "Share all" links (ItemId = 0) stay;
/// shared view simply omits removed rows after UserContent is deleted.
/// </summary>
public static class UserContentCleanup
{
    public const string InterviewQuestionType = "interview-question";
    public const string ProblemType = "problem";

    public static async Task RemoveForDeletedCatalogItemAsync(
        AppDbContext db,
        string itemType,
        int itemId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(itemType) || itemId <= 0)
        {
            return;
        }

        var userRows = await db.UserContents
            .Where(x => x.ItemType == itemType && x.ItemId == itemId)
            .ToListAsync(cancellationToken);
        if (userRows.Count > 0)
        {
            db.UserContents.RemoveRange(userRows);
        }

        // Remove share tokens that only ever pointed at this one item (not "all items" = 0).
        var links = await db.SharedLinks
            .Where(s => s.ItemType == itemType && s.ItemId == itemId)
            .ToListAsync(cancellationToken);
        if (links.Count > 0)
        {
            db.SharedLinks.RemoveRange(links);
        }
    }
}
