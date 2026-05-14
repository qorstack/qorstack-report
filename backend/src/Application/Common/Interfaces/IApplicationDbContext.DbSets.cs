using QorstackReportService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace QorstackReportService.Application.Common.Interfaces;

public partial interface IApplicationDbContext
{

    public DbSet<AnalyticsDailyStat> AnalyticsDailyStats { get; set; }
    public DbSet<AnalyticsHourlyStat> AnalyticsHourlyStats { get; set; }
    public DbSet<AnalyticsTemplateStat> AnalyticsTemplateStats { get; set; }
    public DbSet<ApiKey> ApiKeys { get; set; }
    public DbSet<Font> Fonts { get; set; }
    public DbSet<FontOwnership> FontOwnerships { get; set; }
    public DbSet<MigrationHistory> MigrationHistories { get; set; }
    public DbSet<OtpVerification> OtpVerifications { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectInvitation> ProjectInvitations { get; set; }
    public DbSet<ProjectMember> ProjectMembers { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<ReportJob> ReportJobs { get; set; }
    public DbSet<Template> Templates { get; set; }
    public DbSet<TemplateVersion> TemplateVersions { get; set; }
    public DbSet<User> Users { get; set; }
}
