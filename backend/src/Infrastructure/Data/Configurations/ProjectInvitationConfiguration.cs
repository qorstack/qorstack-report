using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class ProjectInvitationConfiguration : IEntityTypeConfiguration<ProjectInvitation>
    {
        public void Configure(EntityTypeBuilder<ProjectInvitation> builder)
        {
            builder.HasKey(e => e.Id).HasName("project_invitations_pkey");
            builder.ToTable("project_invitations", tb => tb.HasComment("ตาราง invitation สำหรับเชิญ user เข้า project ผ่าน email — รองรับทั้งมีบัญชีและยังไม่มีบัญชี"));
            builder.HasIndex(e => e.Email, "idx_project_invitations_email");
            builder.HasIndex(e => e.ProjectId, "idx_project_invitations_project_id");
            builder.HasIndex(e => new { e.Status, e.ExpiresAt }, "idx_project_invitations_status");
            builder.HasIndex(e => e.Token, "idx_project_invitations_token");
            builder.HasIndex(e => e.Token, "project_invitations_token_key").IsUnique();
            builder.HasOne(d => d.AcceptedByUser).WithMany(p => p.ProjectInvitationAcceptedByUsers) .HasForeignKey(d => d.AcceptedByUserId) .HasConstraintName("project_invitations_fk_accepted_by");
            builder.HasOne(d => d.InvitedByUser).WithMany(p => p.ProjectInvitationInvitedByUsers) .HasForeignKey(d => d.InvitedByUserId) .OnDelete(DeleteBehavior.ClientSetNull) .HasConstraintName("project_invitations_fk_invited_by");
            builder.HasOne(d => d.Project).WithMany(p => p.ProjectInvitations) .HasForeignKey(d => d.ProjectId) .HasConstraintName("project_invitations_fk_project");
        }
    }
}
