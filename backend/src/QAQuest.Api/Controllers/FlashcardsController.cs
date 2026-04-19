using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;

namespace QAQuest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FlashcardsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll()
    {
        var cards = await db.Flashcards
            .Include(f => f.Topic)
            .OrderBy(f => f.Id)
            .Select(f => new
            {
                f.Id,
                f.TopicId,
                Topic = f.Topic!.Name,
                f.Front,
                f.Back,
                f.Difficulty
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(cards));
    }
}
