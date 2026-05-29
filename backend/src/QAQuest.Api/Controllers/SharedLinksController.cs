using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;
using QAQuest.Api.Models;
using System.Security.Cryptography;

namespace QAQuest.Api.Controllers;

[ApiController]
[Route("api/shared-links")]
public class SharedLinksController(AppDbContext db) : ControllerBase
{
    private static readonly string[] AllowedItemTypes = { "interview-question", "problem" };

    private string? CurrentUserId =>
        Request.Headers.TryGetValue("X-User-Id", out var v) ? v.ToString().Trim() : null;

    /// <summary>Creates a read-only share link for a single item or all items of a type.</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateSharedLinkRequest body)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(ApiResponse<object>.Fail("X-User-Id header is required."));
        }

        if (body is null || !AllowedItemTypes.Contains(body.ItemType, StringComparer.Ordinal))
        {
            return BadRequest(ApiResponse<object>.Fail("Valid itemType is required."));
        }

        var token = GenerateToken();
        var row = new SharedLink
        {
            Token = token,
            OwnerUserId = userId,
            ItemType = body.ItemType,
            ItemId = body.ItemId,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = null
        };

        db.SharedLinks.Add(row);
        await db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { token }, "Share link created."));
    }

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(24);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}

[ApiController]
[Route("api/shared")]
public class SharedViewController(AppDbContext db) : ControllerBase
{
    /// <summary>Returns shared user-content (read-only). No auth required.</summary>
    [HttpGet("{token}")]
    public async Task<ActionResult<ApiResponse<object>>> Get(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(ApiResponse<object>.Fail("Token is required."));
        }

        var link = await db.SharedLinks
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Token == token);

        if (link is null)
        {
            return NotFound(ApiResponse<object>.Fail("Share link not found."));
        }

        if (link.ExpiresAtUtc.HasValue && link.ExpiresAtUtc.Value < DateTime.UtcNow)
        {
            return NotFound(ApiResponse<object>.Fail("Share link has expired."));
        }

        IQueryable<UserContent> query = db.UserContents.AsNoTracking()
            .Where(x => x.UserId == link.OwnerUserId && x.ItemType == link.ItemType);

        // ItemId == 0 means "share all"; positive means single item.
        if (link.ItemId > 0)
        {
            query = query.Where(x => x.ItemId == link.ItemId);
        }

        var rows = await query.ToListAsync();

        // Resolve display titles from the global catalog (one batch per type, no N+1 per row).
        var iqIds = rows.Where(x => x.ItemType == "interview-question").Select(x => x.ItemId).Distinct().ToArray();
        var problemIds = rows.Where(x => x.ItemType == "problem").Select(x => x.ItemId).Distinct().ToArray();

        var iqTitleById = iqIds.Length == 0
            ? new Dictionary<int, string>()
            : await db.InterviewQuestions.AsNoTracking()
                .Where(q => iqIds.Contains(q.Id))
                .ToDictionaryAsync(q => q.Id, q => q.Title);

        var problemTitleById = problemIds.Length == 0
            ? new Dictionary<int, string>()
            : await db.Problems.AsNoTracking()
                .Where(p => problemIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Title);

        var items = rows.Select(r =>
        {
            var title = string.Empty;
            if (r.ItemType == "interview-question" && iqTitleById.TryGetValue(r.ItemId, out var tIq))
            {
                title = tIq;
            }
            else if (r.ItemType == "problem" && problemTitleById.TryGetValue(r.ItemId, out var tP))
            {
                title = tP;
            }

            return new
            {
                itemType = r.ItemType,
                itemId = r.ItemId,
                itemTitle = title,
                myAnswer = r.MyAnswer,
                myNotes = r.MyNotes,
                updatedAtUtc = r.UpdatedAtUtc
            };
        }).ToList();

        return Ok(ApiResponse<object>.Ok(new
        {
            ownerUserId = link.OwnerUserId,
            itemType = link.ItemType,
            itemId = link.ItemId,
            items
        }));
    }
}
