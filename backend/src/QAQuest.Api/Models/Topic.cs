namespace QAQuest.Api.Models;

public class Topic
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public ICollection<Problem> Problems { get; set; } = new List<Problem>();
}
