using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Infrastructure.Data.Configurations
{
    public class ProjectMemberConfiguration : IEntityTypeConfiguration<ProjectMember>
    {
        public void Configure(EntityTypeBuilder<ProjectMember> builder)
        {
            builder.HasKey(e => e.Id).HasName("project_members_pkey");
            builder.ToTable("project_members", tb => tb.HasComment("ตารางสมาชิกของแต่ละ project พร้อม role — รองรับ multi-user per project"));
            builder.HasIndex(e => e.ProjectId, "idx_project_members_project_id");
            builder.HasIndex(e => new { e.ProjectId, e.Role }, "idx_project_members_role");
            builder.HasIndex(e => e.UserId, "idx_project_members_user_id");
            builder.HasIndex(e => new { e.ProjectId, e.UserId }, "project_members_uq").IsUnique();
            builder.HasOne(d => d.InvitedByUser).WithMany(p => p.ProjectMemberInvitedByUsers) .HasForeignKey(d => d.InvitedByUserId) .OnDelete(DeleteBehavior.SetNull) .HasConstraintName("project_members_fk_invited_by");
            builder.HasOne(d => d.Project).WithMany(p => p.ProjectMembers) .HasForeignKey(d => d.ProjectId) .HasConstraintName("project_members_fk_project");
            builder.HasOne(d => d.User).WithMany(p => p.ProjectMemberUsers) .HasForeignKey(d => d.UserId) .HasConstraintName("project_members_fk_user");
        }
    }
}
