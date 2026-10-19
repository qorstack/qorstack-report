using System.Reflection;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using NUnit.Framework;

namespace QorstackReportService.Application.UnitTests.Web;

/// <summary>
/// Minimal APIs treat a non-nullable value-type [FromQuery] parameter without a default as REQUIRED: a request that
/// leaves it out gets 400 before the handler runs. 2.3.0 shipped `bool stream` on the import endpoint and broke
/// every dry run (?dryRun=true without stream). Required query flags must be listed here on purpose.
/// </summary>
[TestFixture]
public class EndpointQueryParameterTests
{
    /// <summary>Query parameters that are required by design ("Type.Method.parameter").</summary>
    private static readonly HashSet<string> RequiredOnPurpose = new(StringComparer.Ordinal)
    {
        // Import must say whether it is a preview or the real thing; a missing flag must not apply an import.
        "Projects.ImportProject.dryRun",
    };

    [Test]
    public void ValueTypeQueryParameters_AreOptional_UnlessRequiredOnPurpose()
    {
        var endpointTypes = typeof(QorstackReportService.Web.Endpoints.Projects).Assembly.GetTypes()
            .Where(t => t.Namespace == "QorstackReportService.Web.Endpoints");

        var required = endpointTypes
            .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly)
                .SelectMany(m => m.GetParameters().Select(p => (Type: t, Method: m, Parameter: p))))
            .Where(x => x.Parameter.GetCustomAttribute<FromQueryAttribute>() != null
                        && x.Parameter.ParameterType.IsValueType
                        && Nullable.GetUnderlyingType(x.Parameter.ParameterType) == null
                        && !x.Parameter.HasDefaultValue)
            .Select(x => $"{x.Type.Name}.{x.Method.Name}.{x.Parameter.Name}")
            .Where(name => !RequiredOnPurpose.Contains(name))
            .ToList();

        required.Should().BeEmpty("a missing query value would turn into 400; make it nullable or give it a default");
    }
}
