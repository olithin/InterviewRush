using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Models;
using QAQuest.Api.Seed;

namespace QAQuest.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Topic> Topics => Set<Topic>();
    public DbSet<Problem> Problems => Set<Problem>();
    public DbSet<ProblemExplanation> ProblemExplanations => Set<ProblemExplanation>();
    public DbSet<ProblemSolution> ProblemSolutions => Set<ProblemSolution>();
    public DbSet<Attempt> Attempts => Set<Attempt>();
    public DbSet<Gap> Gaps => Set<Gap>();
    public DbSet<Flashcard> Flashcards => Set<Flashcard>();

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

        SeedData.Apply(modelBuilder);
    }
}
