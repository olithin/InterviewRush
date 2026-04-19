using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;
using QAQuest.Api.Models;

namespace QAQuest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GapsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll()
    {
        var gaps = await db.Gaps
            .Include(g => g.Topic)
            .OrderByDescending(g => g.Severity)
            .Select(g => new
            {
                g.Id,
                g.TopicId,
                Topic = g.Topic!.Name,
                g.Severity,
                g.Notes,
                g.UpdatedAtUtc
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(gaps));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create(CreateGapRequest request)
    {
        var topicExists = await db.Topics.AnyAsync(t => t.Id == request.TopicId);
        if (!topicExists)
        {
            return BadRequest(ApiResponse<object>.Fail("Invalid topic id."));
        }

        var gap = new Gap
        {
            TopicId = request.TopicId,
            Severity = Math.Clamp(request.Severity, 1, 5),
            Notes = request.Notes.Trim(),
            UpdatedAtUtc = DateTime.UtcNow
        };

        db.Gaps.Add(gap);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), ApiResponse<object>.Ok(new { gap.Id }, "Gap saved."));
    }
}
