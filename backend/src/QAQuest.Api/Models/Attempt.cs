namespace QAQuest.Api.Models;

public class Attempt
{
    public int Id { get; set; }
    public int ProblemId { get; set; }
    public Problem? Problem { get; set; }

    public string Mode { get; set; } = "Practice";
    public bool IsCorrect { get; set; }
    public int Score { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
