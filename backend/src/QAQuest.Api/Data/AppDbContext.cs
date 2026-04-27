using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Models;

namespace QAQuest.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Topic> Topics => Set<Topic>();
    public DbSet<Problem> Problems => Set<Problem>();
    public DbSet<ProblemExplanation> ProblemExplanations => Set<ProblemExplanation>();
    public DbSet<ProblemSolution> ProblemSolutions => Set<ProblemSolution>();
    public DbSet<SolutionVersion> SolutionVersions => Set<SolutionVersion>();
    public DbSet<Attempt> Attempts => Set<Attempt>();
    public DbSet<Gap> Gaps => Set<Gap>();
    public DbSet<Flashcard> Flashcards => Set<Flashcard>();
    public DbSet<InterviewQuestion> InterviewQuestions => Set<InterviewQuestion>();
    public DbSet<KnowledgeMapNode> KnowledgeMapNodes => Set<KnowledgeMapNode>();
    public DbSet<UserContent> UserContents => Set<UserContent>();
    public DbSet<SharedLink> SharedLinks => Set<SharedLink>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Problem>()
            .HasIndex(p => p.Slug)
            .IsUnique();

        modelBuilder.Entity<Problem>()
            .HasOne(p => p.Explanation)
            .WithOne(e => e.Problem)
            .HasForeignKey<ProblemExplanation>(e => e.ProblemId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SolutionVersion>()
            .HasOne(v => v.ProblemSolution)
            .WithMany()
            .HasForeignKey(v => v.ProblemSolutionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<KnowledgeMapNode>()
            .HasOne(n => n.Parent)
            .WithMany(n => n.Children)
            .HasForeignKey(n => n.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<KnowledgeMapNode>()
            .HasIndex(n => new { n.MapKey, n.ParentId, n.SortOrder });

        modelBuilder.Entity<UserContent>()
            .HasKey(u => u.Id);
        modelBuilder.Entity<UserContent>()
            .HasIndex(u => new { u.UserId, u.ItemType, u.ItemId })
            .IsUnique();

        modelBuilder.Entity<SharedLink>()
            .HasKey(s => s.Token);
    }
}
