using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;

namespace QAQuest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TopicsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll()
    {
        var topics = await db.Topics
            .OrderBy(t => t.Id)
            .Select(t => new { t.Id, t.Name, t.Description })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(topics));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
    {
        var topic = await db.Topics
            .Where(t => t.Id == id)
            .Select(t => new
            {
                t.Id,
                t.Name,
                t.Description,
                ProblemCount = t.Problems.Count
            })
            .FirstOrDefaultAsync();

        return topic is null
            ? NotFound(ApiResponse<object>.Fail("Topic not found."))
            : Ok(ApiResponse<object>.Ok(topic));
    }
}
