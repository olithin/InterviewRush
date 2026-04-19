namespace QAQuest.Api.Models;

public class Flashcard
{
    public int Id { get; set; }
    public int TopicId { get; set; }
    public Topic? Topic { get; set; }

    public string Front { get; set; } = string.Empty;
    public string Back { get; set; } = string.Empty;
    public int Difficulty { get; set; } = 1;
}
