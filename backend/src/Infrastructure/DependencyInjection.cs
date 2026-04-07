using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Infrastructure.Data;
using QorstackReportService.Infrastructure.Data.Interceptors;
using QorstackReportService.Infrastructure.Services;
using QorstackReportService.Infrastructure.Services.Document;
using QorstackReportService.Infrastructure.Services.Encryption;
using QorstackReportService.Infrastructure.Services.Pdf;
using QorstackReportService.Infrastructure.Services.QrCode;
using QorstackReportService.Infrastructure.Services.Barcode;
using QorstackReportService.Infrastructure.Services.Storage;
using QorstackReportService.Infrastructure.Services.Font;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ardalis.GuardClauses;

namespace Microsoft.Extensions.DependencyInjection
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructureServices(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // 1. Database connection & interceptors
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(connectionString))
            {
                // For development, use a default connection string or skip database setup
                connectionString = "Host=localhost;Port=5432;Database=qorstack_report_dev;Username=postgres;Password=password";
            }

            services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
            services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

            services.AddDbContext<ApplicationDbContext>((sp, options) =>
            {
                options.UseNpgsql(connectionString)
                       .UseSnakeCaseNamingConvention()
                       .EnableSensitiveDataLogging();

                var interceptors = sp.GetServices<ISaveChangesInterceptor>();
                options.AddInterceptors(interceptors);
            });

            services.AddDbContextFactory<ApplicationDbContext>((sp, options) =>
            {
                options.UseNpgsql(connectionString)
                       .UseSnakeCaseNamingConvention()
                       .EnableSensitiveDataLogging();

                var interceptors = sp.GetServices<ISaveChangesInterceptor>();
                options.AddInterceptors(interceptors);
            }, lifetime: ServiceLifetime.Scoped);

            services.AddScoped<IApplicationDbContext>(provider =>
                provider.GetRequiredService<ApplicationDbContext>());

            services.AddScoped<IApplicationDbContextFactory, ApplicationDbContextFactory>();

            // Identity services commented out - not using ApplicationUser
            // services
            //     .AddIdentityCore<ApplicationUser>()
            //     .AddRoles<IdentityRole>()
            //     .AddEntityFrameworkStores<ApplicationDbContext>()
            //     .AddApiEndpoints();

            //services.AddAuthorization(options =>
            //    options.AddPolicy(Policies.CanPurge,
            //        policy => policy.RequireRole(AuthRoles.Administrator)));

            services.AddSingleton(TimeProvider.System);

            // Encryption Service
            services.AddScoped<IEncryptionService, AesEncryptionService>();

            // Database migration on startup (runs SQL files from /databases/ folder)
            services.AddHostedService<DatabaseMigrationService>();

            // MinIO Storage Service
            services.Configure<MinioSettings>(configuration.GetSection("Minio"));
            services.AddScoped<IMinioStorageService, MinioStorageService>();
            services.AddHostedService<StorageInitializer>();

            // Font sync — detects add/update/delete in FontStorage:LocalPath every startup
            services.AddHostedService<FontSyncService>();

            // Gotenberg PDF Service
            services.Configure<GotenbergSettings>(configuration.GetSection("Gotenberg"));
            services.AddHttpClient<IGotenbergService, GotenbergService>();

            // PDF post-processing (OSS: passthrough — Pro module replaces this via services.Replace())
            services.AddScoped<IPdfPostProcessingService, PassthroughPdfPostProcessingService>();

            // Quota service (OSS: always free — SaaS module replaces this via services.Replace())
            services.AddScoped<IReportJobQuotaService, FreeQuotaService>();

            // Feature flags (OSS: all Pro features disabled — Pro module replaces this via services.Replace())
            services.AddSingleton<IFeatureFlagService, DefaultFeatureFlagService>();

            // QR Code Service
            services.AddScoped<IQrCodeService, QrCodeService>();

            // Barcode Service
            services.AddScoped<IBarcodeService, BarcodeService>();

            // DOCX Processing Service
            services.AddHttpClient(); // For image downloads in DOCX/Excel processing
            services.AddScoped<IDocxProcessingService, DocxProcessingService>();

            // Excel Processing Service (ClosedXML)
            services.AddScoped<IExcelProcessingService, ExcelProcessingService>();

            // Template Key Generator
            services.AddScoped<ITemplateKeyGenerator, TemplateKeyGenerator>();

            // Note: Identity services (IAuthService, IOtpService, IEmailService, IJwtTokenGenerator)
            // have been moved to Application layer

            return services;
        }
    }
}
