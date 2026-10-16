using FluentAssertions;
using Npgsql;
using NUnit.Framework;
using QorstackReportService.Infrastructure.Services.Render;

namespace QorstackReportService.Application.UnitTests.Reports;

/// <summary>
/// Queue SQL against a real Postgres. Opt-in: set QORSTACK_TEST_PG to a connection string of a THROWAWAY,
/// empty database; the test applies database/*.sql to it. Example:
///   docker run -d --rm --name qr-pg -e POSTGRES_PASSWORD=pg -p 55432:5432 postgres:16
///   QORSTACK_TEST_PG="Host=localhost;Port=55432;Database=postgres;Username=postgres;Password=pg" dotnet test --filter RenderJobStorePostgresTests
/// </summary>
[TestFixture]
[Category("RequiresPostgres")]
public class RenderJobStorePostgresTests
{
    private NpgsqlDataSource _db = null!;
    private RenderJobStore _store = null!;
    private Guid _userId;
    private Guid _versionId;

    [OneTimeSetUp]
    public async Task SetUp()
    {
        var cs = Environment.GetEnvironmentVariable("QORSTACK_TEST_PG");
        if (string.IsNullOrWhiteSpace(cs)) Assert.Ignore("QORSTACK_TEST_PG not set — skipping Postgres queue tests.");

        _db = NpgsqlDataSource.Create(cs);
        _store = new RenderJobStore(_db);

        var exists = await Scalar<bool>("SELECT to_regclass('public.report_jobs') IS NOT NULL");
        if (!exists)
        {
            var dir = FindDatabaseDir();
            foreach (var file in Directory.GetFiles(dir, "*.sql").OrderBy(Path.GetFileName))
                await Exec(await File.ReadAllTextAsync(file));
        }

        _userId = await Scalar<Guid>("INSERT INTO users (email) VALUES ('queue-test-' || gen_random_uuid() || '@test') RETURNING id");
        var templateId = await Scalar<Guid>(
            $"INSERT INTO templates (user_id, template_key, name) VALUES ('{_userId}', 'q-' || gen_random_uuid(), 'queue test') RETURNING id");
        _versionId = await Scalar<Guid>(
            $"INSERT INTO template_versions (template_id, version, file_path) VALUES ('{templateId}', 1, 'x.docx') RETURNING id");
    }

    [OneTimeTearDown]
    public async Task TearDown()
    {
        if (_db == null) return;
        await Exec($"DELETE FROM users WHERE id = '{_userId}'");
        await _db.DisposeAsync();
    }

    [SetUp]
    public Task ClearJobs() => Exec($"DELETE FROM report_jobs WHERE user_id = '{_userId}'");

    [Test]
    public async Task TwoWorkers_NeverClaimTheSameJob()
    {
        for (var i = 0; i < 20; i++) await InsertJob();

        var claims = await Task.WhenAll(Enumerable.Range(0, 2).Select(w => Task.Run(async () =>
        {
            var mine = new List<Guid>();
            while (await _store.ClaimAsync($"w{w}", TimeSpan.FromMinutes(5), CancellationToken.None) is { } job)
                mine.Add(job.Id);
            return mine;
        })));

        var all = claims.SelectMany(c => c).ToList();
        all.Should().HaveCount(20).And.OnlyHaveUniqueItems();
    }

    [Test]
    public async Task ExpiredLease_IsReclaimed_AndCountsAnAttempt()
    {
        var id = await InsertJob();
        (await _store.ClaimAsync("crashed", TimeSpan.FromMinutes(5), CancellationToken.None))!.Id.Should().Be(id);
        (await _store.ClaimAsync("other", TimeSpan.FromMinutes(5), CancellationToken.None)).Should().BeNull("the lease is still valid");

        await Exec($"UPDATE report_jobs SET locked_until = now() - interval '1 second' WHERE id = '{id}'");
        var again = await _store.ClaimAsync("other", TimeSpan.FromMinutes(5), CancellationToken.None);

        again!.Id.Should().Be(id);
        again.Attempts.Should().Be(2);
    }

    [Test]
    public async Task RetryDelay_HoldsTheJobBack()
    {
        var id = await InsertJob();
        await _store.ClaimAsync("w", TimeSpan.FromMinutes(5), CancellationToken.None);
        await _store.RetryLaterAsync(id, TimeSpan.FromMinutes(1), "gotenberg down", CancellationToken.None);

        (await _store.ClaimAsync("w", TimeSpan.FromMinutes(5), CancellationToken.None)).Should().BeNull();
        (await Scalar<string>($"SELECT status FROM report_jobs WHERE id = '{id}'")).Should().Be("pending");
    }

    [Test]
    public async Task FinishedJobs_DropTheirPayload()
    {
        var done = await InsertJob();
        var failed = await InsertJob();
        await _store.ClaimAsync("w", TimeSpan.FromMinutes(5), CancellationToken.None);
        await _store.ClaimAsync("w", TimeSpan.FromMinutes(5), CancellationToken.None);

        await Exec($"UPDATE report_jobs SET status = 'success' WHERE id = '{done}'"); // what the render handler does
        await _store.CompleteAsync(done, CancellationToken.None);
        await _store.FailAsync(failed, "bad template", CancellationToken.None);

        (await Scalar<long>($"SELECT count(*) FROM report_jobs WHERE user_id = '{_userId}' AND payload IS NOT NULL")).Should().Be(0);
        (await Scalar<string>($"SELECT status FROM report_jobs WHERE id = '{failed}'")).Should().Be("failed");
        (await _store.ClaimAsync("w", TimeSpan.FromMinutes(5), CancellationToken.None)).Should().BeNull();
    }

    [Test]
    public async Task SynchronousJobRows_AreIgnored()
    {
        await Exec($"INSERT INTO report_jobs (user_id, template_version_id, status) VALUES ('{_userId}', '{_versionId}', 'processing')");
        (await _store.ClaimAsync("w", TimeSpan.FromMinutes(5), CancellationToken.None)).Should().BeNull();
    }

    [Test]
    public async Task Claim_ReturnsTheTemplateId()
    {
        await InsertJob();
        var job = await _store.ClaimAsync("w", TimeSpan.FromMinutes(5), CancellationToken.None);
        job!.TemplateId.Should().NotBeNull();
        job.Payload.Should().Contain("\"kind\"");
    }

    private async Task<Guid> InsertJob() => await Scalar<Guid>($$$"""
        INSERT INTO report_jobs (user_id, template_version_id, status, payload, available_at, created_datetime)
        VALUES ('{{{_userId}}}', '{{{_versionId}}}', 'pending', '{"kind":"pdf","command":{}}', now(), clock_timestamp())
        RETURNING id
        """);

    private async Task Exec(string sql)
    {
        await using var cmd = _db.CreateCommand(sql);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<T> Scalar<T>(string sql)
    {
        await using var cmd = _db.CreateCommand(sql);
        return (T)(await cmd.ExecuteScalarAsync())!;
    }

    private static string FindDatabaseDir()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir != null; dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, "database");
            if (File.Exists(Path.Combine(candidate, "001_core-schema.sql"))) return candidate;
        }
        throw new DirectoryNotFoundException("database/*.sql not found above the test output folder.");
    }
}
