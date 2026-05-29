using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;
using QAQuest.Api.Models;

namespace QAQuest.Api.Controllers;

/// <summary>
/// Personal per-user answers and notes for interview questions and problems.
/// User identity comes from the X-User-Id header (email from NextAuth session).
/// MVP: the header is trusted. Harden later with JWT signature validation.
/// </summary>
[ApiController]
[Route("api/user-content")]
public class UserContentController(AppDbContext db) : ControllerBase
{
    private static readonly string[] AllowedItemTypes = { "interview-question", "problem" };

    private string? CurrentUserId =>
        Request.Headers.TryGetValue("X-User-Id", out var v) ? v.ToString().Trim() : null;

    [HttpGet("{itemType}/{itemId:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Get(string itemType, int itemId)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(ApiResponse<object>.Fail("X-User-Id header is required."));
        }

        if (!AllowedItemTypes.Contains(itemType, StringComparer.Ordinal))
        {
            return BadRequest(ApiResponse<object>.Fail("Invalid itemType."));
        }

        var row = await db.UserContents
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ItemType == itemType && x.ItemId == itemId);

        return Ok(ApiResponse<object>.Ok(row is null
            ? new { myAnswer = string.Empty, myNotes = string.Empty, exists = false }
            : new { myAnswer = row.MyAnswer, myNotes = row.MyNotes, exists = true }));
    }

    [HttpPut("{itemType}/{itemId:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Upsert(
        string itemType,
        int itemId,
        [FromBody] UpsertUserContentRequest body)
    {
        var userId = CurrentUserId;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(ApiResponse<object>.Fail("X-User-Id header is required."));
        }

        if (!AllowedItemTypes.Contains(itemType, StringComparer.Ordinal))
        {
            return BadRequest(ApiResponse<object>.Fail("Invalid itemType."));
        }

        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var row = await db.UserContents
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ItemType == itemType && x.ItemId == itemId);

        var now = DateTime.UtcNow;
        if (row is null)
        {
            row = new UserContent
            {
                UserId = userId,
                ItemType = itemType,
                ItemId = itemId,
                MyAnswer = body.MyAnswer?.Trim() ?? string.Empty,
                MyNotes = body.MyNotes?.Trim() ?? string.Empty,
                UpdatedAtUtc = now
            };
            db.UserContents.Add(row);
        }
        else
        {
            row.MyAnswer = body.MyAnswer?.Trim() ?? string.Empty;
            row.MyNotes = body.MyNotes?.Trim() ?? string.Empty;
            row.UpdatedAtUtc = now;
        }

        await db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { saved = true }, "Saved."));
    }
}
