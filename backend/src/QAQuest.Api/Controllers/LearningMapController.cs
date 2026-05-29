using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;

namespace QAQuest.Api.Controllers;

/// <summary>Read-only learning map: topic (trigger) → pattern → problems.</summary>
[ApiController]
[Route("api/learning-map")]
public class LearningMapController(AppDbContext db) : ControllerBase
{
    [HttpGet("tree")]
    public async Task<ActionResult<ApiResponse<object>>> GetTree(CancellationToken cancellationToken)
    {
        var rows = await db.Problems
            .AsNoTracking()
            .Include(p => p.Topic)
            .Include(p => p.Explanation)
            .OrderBy(p => p.Topic!.Name)
            .ThenBy(p => p.Title)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Difficulty,
                TopicId = p.TopicId,
                TopicName = p.Topic != null ? p.Topic.Name : "General",
                Pattern = p.Explanation != null && !string.IsNullOrWhiteSpace(p.Explanation.Pattern)
                    ? p.Explanation.Pattern.Trim()
                    : p.Topic != null
                        ? p.Topic.Name
                        : "General"
            })
            .ToListAsync(cancellationToken);

        var triggerGroups = rows
            .GroupBy(x => (x.TopicId, x.TopicName))
            .OrderBy(g => g.Key.TopicName, StringComparer.OrdinalIgnoreCase)
            .Select(tg => new
            {
                id = tg.Key.TopicId,
                label = tg.Key.TopicName,
                multiplePatterns = tg.Select(x => x.Pattern).Distinct(StringComparer.OrdinalIgnoreCase).Count() > 1,
                patterns = tg
                    .GroupBy(x => x.Pattern)
                    .OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase)
                    .Select(pg => new
                    {
                        label = pg.Key,
                        problemCount = pg.Count(),
                        problems = pg
                            .OrderBy(x => x.Title, StringComparer.OrdinalIgnoreCase)
                            .Select(p => new
                            {
                                p.Id,
                                p.Title,
                                p.Difficulty
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .ToList();

        return Ok(ApiResponse<object>.Ok(new { triggers = triggerGroups }));
    }
}
