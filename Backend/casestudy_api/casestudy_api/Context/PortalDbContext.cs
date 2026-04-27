using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

public class PortalDbContext(DbContextOptions options)
    : IdentityDbContext<IdentityUser>(options)
{
    public DbSet<ApplicationUser> users { get; set; }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
    }
}

public class ApplicationUser : IdentityUser
{
    public string? FullName { get; set; }
}