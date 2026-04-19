using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;

namespace QAQuest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProblemsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll()
    {
        var problems = await db.Problems
            .Include(p => p.Topic)
            .OrderBy(p => p.Id)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                p.Difficulty,
                p.ProblemStatement,
                Topic = p.Topic!.Name
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(problems));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
    {
        var problem = await db.Problems
            .Include(p => p.Topic)
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                p.Difficulty,
                p.ProblemStatement,
                Topic = p.Topic!.Name
            })
            .FirstOrDefaultAsync();

        return problem is null
            ? NotFound(ApiResponse<object>.Fail("Problem not found."))
            : Ok(ApiResponse<object>.Ok(problem));
    }

    [HttpGet("{id:int}/explanation")]
    public async Task<ActionResult<ApiResponse<object>>> GetExplanation(int id)
    {
        var explanation = await db.ProblemExplanations
            .Where(e => e.ProblemId == id)
            .Select(e => new
            {
                e.ProblemId,
                e.Pattern,
                e.WordingSignals,
                e.HowToThink,
                e.BruteForceIdea,
                e.OptimalIdea,
                e.StepByStepAlgorithm,
                e.WhyThisWorks,
                e.Complexity,
                e.CommonMistakes,
                e.EnglishInterviewExplanation,
                e.RussianShortExplanation
            })
            .FirstOrDefaultAsync();

        return explanation is null
            ? NotFound(ApiResponse<object>.Fail("Problem explanation not found."))
            : Ok(ApiResponse<object>.Ok(explanation));
    }

    [HttpGet("{id:int}/solutions")]
    public async Task<ActionResult<ApiResponse<object>>> GetSolutions(int id)
    {
        var solutions = await db.ProblemSolutions
            .Where(s => s.ProblemId == id)
            .Select(s => new
            {
                s.Id,
                s.Language,
                s.SolutionCode,
                s.NUnitTestsCode
            })
            .ToListAsync();

        return solutions.Count == 0
            ? NotFound(ApiResponse<object>.Fail("Problem solutions not found."))
            : Ok(ApiResponse<object>.Ok(solutions));
    }
}
