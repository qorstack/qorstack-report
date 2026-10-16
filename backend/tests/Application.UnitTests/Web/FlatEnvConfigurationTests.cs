using FluentAssertions;
using NUnit.Framework;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Application.UnitTests.Web;

/// <summary>Flat deploy variable names (DB_HOST, STORAGE_ENDPOINT …) → configuration keys, and the .env parser.</summary>
[TestFixture]
public class FlatEnvConfigurationTests
{
    private static Func<string, string?> From(Dictionary<string, string> values) => name => values.GetValueOrDefault(name);

    [Test]
    public void MapsFlatNamesToConfigKeys()
    {
        var result = FlatEnvConfiguration.Resolve(From(new()
        {
            ["STORAGE_ENDPOINT"] = "localhost:9000",
            ["JWT_KEY"] = "k",
            ["RENDER_MAX_TABLE_ROWS"] = "10",
            ["PROJECT_IMPORT_MAX_MB"] = "50",
            ["PUBLIC_URL"] = "http://localhost:3000"
        }));

        result.Should().Contain("Storage:Endpoint", "localhost:9000")
            .And.Contain("Jwt:Key", "k")
            .And.Contain("Render:MaxTableRows", "10")
            .And.Contain("Transfer:MaxZipMb", "50")
            .And.Contain("App:PublicUrl", "http://localhost:3000");
        result.Should().NotContainKey(FlatEnvConfiguration.ConnectionStringKey);
    }

    [Test]
    public void StorageFallsBackToLegacyMinioNames_AndStorageWins()
    {
        FlatEnvConfiguration.Resolve(From(new() { ["MINIO_ENDPOINT"] = "old:9000" }))
            .Should().Contain("Storage:Endpoint", "old:9000");
        FlatEnvConfiguration.Resolve(From(new() { ["MINIO_ENDPOINT"] = "old:9000", ["STORAGE_ENDPOINT"] = "new:9000" }))
            .Should().Contain("Storage:Endpoint", "new:9000");
    }

    [Test]
    public void BuildsConnectionStringFromDbVariables_WithComposeDefaults()
    {
        var result = FlatEnvConfiguration.Resolve(From(new() { ["DB_HOST"] = "db", ["DB_PASSWORD"] = "pw" }));
        result[FlatEnvConfiguration.ConnectionStringKey].Should()
            .Be("Host=db;Port=5432;Database=qorstack_report;Username=postgres;Password=pw");
    }

    [Test]
    public void OptionalSchemaBecomesSearchPath()
    {
        FlatEnvConfiguration.Resolve(From(new() { ["DB_HOST"] = "db", ["DB_PASSWORD"] = "pw", ["DB_SCHEMA"] = "report" }))
            [FlatEnvConfiguration.ConnectionStringKey].Should().EndWith(";Search Path=report");
    }

    [Test]
    public void ExplicitSectionVariableWins()
    {
        var result = FlatEnvConfiguration.Resolve(
            From(new() { ["STORAGE_ENDPOINT"] = "flat:9000", ["DB_HOST"] = "db" }),
            key => key is "Storage:Endpoint" or FlatEnvConfiguration.ConnectionStringKey);

        result.Should().NotContainKey("Storage:Endpoint").And.NotContainKey(FlatEnvConfiguration.ConnectionStringKey);
    }

    [Test]
    public void EmptyValuesAreIgnored()
    {
        FlatEnvConfiguration.Resolve(From(new() { ["JWT_KEY"] = "" })).Should().BeEmpty();
    }

    [Test]
    public void ParsesDotEnv()
    {
        var text = "# comment\n\nexport A=1\nB = two \r\nC=\"quoted # not a comment\"\nD=p#ss # trailing comment\nE='single'\nNOEQUALS\n";
        var values = FlatEnvConfiguration.ParseDotEnv(text);

        values.Should().Contain("A", "1").And.Contain("B", "two").And.Contain("C", "quoted # not a comment")
            .And.Contain("D", "p#ss").And.Contain("E", "single");
        values.Should().NotContainKey("NOEQUALS");
    }

    [Test]
    public void FindsRepoRootEnv()
    {
        var root = Directory.CreateTempSubdirectory("qr-env-");
        try
        {
            File.WriteAllText(Path.Combine(root.FullName, "versions.mk"), "");
            File.WriteAllText(Path.Combine(root.FullName, ".env"), "A=1");
            var deep = Directory.CreateDirectory(Path.Combine(root.FullName, "backend", "src", "Web"));

            FlatEnvConfiguration.FindRepoDotEnv(deep.FullName).Should().Be(Path.Combine(root.FullName, ".env"));
        }
        finally
        {
            root.Delete(true);
        }
    }
}
