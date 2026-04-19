namespace QAQuest.Api.Dtos;

public record CreateAttemptRequest(int ProblemId, string Mode, bool IsCorrect, int Score, int DurationSeconds);
