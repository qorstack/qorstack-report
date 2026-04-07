using System.Reflection;
using QorstackReportService.Infrastructure.Data.Configurations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace QorstackReportService.Infrastructure.Extensions;

/// <summary>
/// Extension methods สำหรับจัดการ Entity และ Configuration Overrides
/// </summary>
public static class OverrideExtensions
{
    /// <summary>
    /// Apply Configuration Overrides แบบอัตโนมัติ
    /// </summary>
    /// <param name="modelBuilder">ModelBuilder instance</param>
    /// <param name="assembly">Assembly ที่จะค้นหา Override Configurations</param>
    public static void ApplyConfigurationOverrides(this ModelBuilder modelBuilder, Assembly assembly)
    {
        var configurationTypes = assembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract)
            .Where(t => IsConfigurationOverrideType(t))
            .OrderByDescending(t => GetConfigurationPriority(t))
            .ToList();

        var processedEntityTypes = new HashSet<Type>();

        foreach (var configurationType in configurationTypes)
        {
            var entityType = GetEntityTypeFromConfiguration(configurationType);
            if (entityType == null || processedEntityTypes.Contains(entityType))
                continue;

            var configurationInstance = Activator.CreateInstance(configurationType);
            if (configurationInstance == null)
                continue;

            // ตรวจสอบว่าเป็น Override Configuration หรือไม่
            if (IsConfigurationOverride(configurationType, out var originalConfigType, out var includeOriginal))
            {
                if (includeOriginal && originalConfigType != null)
                {
                    // Apply Original Configuration ก่อน
                    var originalInstance = Activator.CreateInstance(originalConfigType);
                    if (originalInstance != null)
                    {
                        ApplyConfiguration(modelBuilder, entityType, originalInstance);
                    }
                }
            }

            // Apply Override Configuration
            ApplyConfiguration(modelBuilder, entityType, configurationInstance);
            processedEntityTypes.Add(entityType);
        }
    }

    /// <summary>
    /// Apply Configurations ปกติสำหรับ Entity ที่ไม่มี Override
    /// </summary>
    /// <param name="modelBuilder">ModelBuilder instance</param>
    /// <param name="assembly">Assembly ที่จะค้นหา Configurations</param>
    public static void ApplyStandardConfigurations(this ModelBuilder modelBuilder, Assembly assembly)
    {
        var overrideEntityTypes = GetOverrideEntityTypes(assembly);

        var configurationTypes = assembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract)
            .Where(t => IsStandardConfigurationType(t))
            .Where(t => !IsConfigurationOverrideType(t))
            .ToList();

        foreach (var configurationType in configurationTypes)
        {
            var entityType = GetEntityTypeFromConfiguration(configurationType);
            if (entityType == null || overrideEntityTypes.Contains(entityType))
                continue; // Skip entities that have overrides

            var configurationInstance = Activator.CreateInstance(configurationType);
            if (configurationInstance != null)
            {
                ApplyConfiguration(modelBuilder, entityType, configurationInstance);
            }
        }
    }

    private static bool IsConfigurationOverrideType(Type type)
    {
        return type.GetInterfaces()
            .Any(i => i.IsGenericType &&
                     i.GetGenericTypeDefinition() == typeof(IConfigurationOverride<,>));
    }

    private static bool IsStandardConfigurationType(Type type)
    {
        return type.GetInterfaces()
            .Any(i => i.IsGenericType &&
                     i.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>));
    }

    private static int GetConfigurationPriority(Type configurationType)
    {
        try
        {
            var instance = Activator.CreateInstance(configurationType);
            var overrideInterface = configurationType.GetInterfaces()
                .FirstOrDefault(i => i.IsGenericType &&
                                    i.GetGenericTypeDefinition() == typeof(IConfigurationOverride<,>));

            if (overrideInterface != null)
            {
                var priorityProperty = overrideInterface.GetProperty("Priority");
                if (priorityProperty != null)
                {
                    var priority = priorityProperty.GetValue(instance);
                    return priority is int intPriority ? intPriority : 100;
                }
            }
        }
        catch
        {
            // Ignore errors when getting priority
        }
        return 0;
    }

    private static Type? GetEntityTypeFromConfiguration(Type configurationType)
    {
        var interfaceType = configurationType.GetInterfaces()
            .FirstOrDefault(i => i.IsGenericType &&
                                (i.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>) ||
                                 i.GetGenericTypeDefinition() == typeof(IConfigurationOverride<,>)));

        return interfaceType?.GetGenericArguments().FirstOrDefault();
    }

    private static bool IsConfigurationOverride(Type configurationType, out Type? originalConfigType, out bool includeOriginal)
    {
        originalConfigType = null;
        includeOriginal = false;

        var overrideInterface = configurationType.GetInterfaces()
            .FirstOrDefault(i => i.IsGenericType &&
                                i.GetGenericTypeDefinition() == typeof(IConfigurationOverride<,>));

        if (overrideInterface != null)
        {
            originalConfigType = overrideInterface.GetGenericArguments()[1];

            try
            {
                var instance = Activator.CreateInstance(configurationType);
                var includeOriginalProperty = overrideInterface.GetProperty("IncludeOriginalConfiguration");
                if (includeOriginalProperty != null)
                {
                    var includeValue = includeOriginalProperty.GetValue(instance);
                    includeOriginal = includeValue is bool boolValue ? boolValue : true;
                }
                else
                {
                    includeOriginal = true;
                }
            }
            catch
            {
                includeOriginal = true; // Default to true
            }

            return true;
        }

        return false;
    }

    private static void ApplyConfiguration(ModelBuilder modelBuilder, Type entityType, object configurationInstance)
    {
        var applyConfigurationMethod = typeof(ModelBuilder)
            .GetMethods()
            .Where(m => m.Name == "ApplyConfiguration")
            .Where(m => m.IsGenericMethodDefinition)
            .FirstOrDefault();

        if (applyConfigurationMethod != null)
        {
            var genericMethod = applyConfigurationMethod.MakeGenericMethod(entityType);
            genericMethod.Invoke(modelBuilder, new[] { configurationInstance });
        }
    }

    private static HashSet<Type> GetOverrideEntityTypes(Assembly assembly)
    {
        return assembly.GetTypes()
            .Where(t => IsConfigurationOverrideType(t))
            .Select(t => GetEntityTypeFromConfiguration(t))
            .Where(t => t != null)
            .Cast<Type>()
            .ToHashSet();
    }
}
