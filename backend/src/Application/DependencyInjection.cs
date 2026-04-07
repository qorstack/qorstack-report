using System.Reflection;
using QorstackReportService.Application.Auth.Common;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Services;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        var mapsterConfig = TypeAdapterConfig.GlobalSettings;
        mapsterConfig.Scan(Assembly.GetExecutingAssembly());
        services.AddSingleton(mapsterConfig);

        services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(QorstackReportService.Application.Common.Behaviours.UnhandledExceptionBehaviour<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(QorstackReportService.Application.Common.Behaviours.AuthorizationBehaviour<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(QorstackReportService.Application.Common.Behaviours.ValidationBehaviour<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(QorstackReportService.Application.Common.Behaviours.PerformanceBehaviour<,>));
        });

        // Auth Services (moved from Infrastructure)
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<PasswordHasherService>();

        return services;
    }
}
