using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;
using QAQuest.Api.Models;

namespace QAQuest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttemptsController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create(CreateAttemptRequest request)
    {
        var problemExists = await db.Problems.AnyAsync(p => p.Id == request.ProblemId);
        if (!problemExists)
        {
            return BadRequest(ApiResponse<object>.Fail("Invalid problem id."));
        }

        var attempt = new Attempt
        {
            ProblemId = request.ProblemId,
            Mode = string.IsNullOrWhiteSpace(request.Mode) ? "Practice" : request.Mode.Trim(),
            IsCorrect = request.IsCorrect,
            Score = request.Score,
            DurationSeconds = request.DurationSeconds,
            CreatedAtUtc = DateTime.UtcNow
        };

        db.Attempts.Add(attempt);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Create), ApiResponse<object>.Ok(new { attempt.Id }, "Attempt recorded."));
    }
}
