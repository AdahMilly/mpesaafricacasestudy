

using Microsoft.EntityFrameworkCore;
using Npgsql;

internal static class PostgresInjector
{

    internal static IServiceCollection InjectPostgres(this IServiceCollection services, IConfiguration configuration)
    {
        bool isRunningOnDocker = Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") is "true";

        var port2 = Environment.GetEnvironmentVariable("POSTGRES_PORT")!;


        var host = (isRunningOnDocker ? configuration["POSTGRES_HOST_DOCKER"] : configuration["POSTGRES_HOST"])!;
        var port = configuration["POSTGRES_PORT"]!;
        var db = configuration["POSTGRES_DB"]!;
        var user = configuration["POSTGRES_USER"]!;
        var password = configuration["POSTGRES_PASSWORD"]!;

        var major = configuration.GetValue<int>("POSTGRES_MAJOR_VERSION");
        var minor = configuration.GetValue<int>("POSTGRES_MINOR_VERSION");

        var connectionString = $"Host={host};Port={port};Database={db};Username={user};Password={password}; Pooling=true; Minimum Pool Size=10; Maximum Pool Size=100;Include Error Detail=true;";

        // Validate PostgreSQL connectivity during application startup
        ValidatePostgresConnection(connectionString);

        services.AddDbContextFactory<PortalDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5),
                    errorCodesToAdd: null);

                npgsqlOptions.SetPostgresVersion(new Version(major, minor));

                // For better performance
                npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
            });

            options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);

            // Get IWebHostEnvironment from service provider
            var env = serviceProvider.GetService<IWebHostEnvironment>();

            if (env == null || !env.IsDevelopment()) return;

            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
            options.LogTo(Console.WriteLine, LogLevel.Information);
        });


        return services;
    }
    private static void ValidatePostgresConnection(string connectionString)
    {
        const int maxAttempts = 10;
        var delay = TimeSpan.FromSeconds(5);

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var connection = new NpgsqlConnection(connectionString);
                connection.Open();

                using var command = new NpgsqlCommand("SELECT 1", connection);
                command.ExecuteScalar();

                Console.WriteLine("PostgreSQL connection established successfully.");
                return;
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"PostgreSQL connection attempt {attempt}/{maxAttempts} failed: {ex.Message}");

                if (attempt == maxAttempts)
                {
                    throw new InvalidOperationException(
                        "Unable to connect to PostgreSQL after multiple attempts.",
                        ex);
                }

                Thread.Sleep(delay);
            }
        }
    }
}