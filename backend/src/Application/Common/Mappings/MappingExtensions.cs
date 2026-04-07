using System.Linq.Dynamic.Core;
using System.Reflection;
using QorstackReportService.Application.Common.Models;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace QorstackReportService.Application.Common.Mappings;

public static class MappingExtensions
{
    public static Task<PaginatedList<TDestination>> PaginatedListAsync<TDestination>(this IQueryable<TDestination> queryable, int pageNumber, int pageSize) where TDestination : class
        => PaginatedList<TDestination>.CreateAsync(queryable.AsNoTracking(), pageNumber, pageSize);

    public static IQueryable<T> Sort<T>(this IQueryable<T> source, string? sortPath, SortDirection? direction) where T : class
    {
        //if (string.IsNullOrWhiteSpace(sortPath) || direction == null) return source;

        //var ordering = $"{sortPath} {(direction == SortDirection.Descending ? "descending" : "ascending")}";
        //return source.OrderBy(ordering);

        if (direction is null || string.IsNullOrWhiteSpace(sortPath))
            return source;

        var directionStr = direction == SortDirection.Descending ? " descending" : " ascending";
        // 4) hand off to the dynamic OrderBy(string)
        return source.OrderBy($"{sortPath} {directionStr}");

    }

    /// <summary>
    /// คัดลอกข้อมูลจาก Entity<T> ไปยัง TLog แล้วเพิ่ม Action (Added/Modified/Deleted) และ timestamp
    /// </summary>
    public static EntityEntry<T> AddLog<T, TLog>(this EntityEntry<T> entry, DbContext context)
        where T : class
        where TLog : class, new()
    {
        var entity = entry.Entity;
        var log = new TLog();

        // 1. copy property ชื่อเดียวกัน และ type เดียวกัน
        var sourceProps = typeof(T).GetProperties().Where(p => p.CanRead);
        var targetProps = typeof(TLog).GetProperties().Where(p => p.CanWrite);
        foreach (var sp in sourceProps)
        {
            var tp = targetProps.FirstOrDefault(p => p.Name == sp.Name && p.PropertyType == sp.PropertyType);
            if (tp != null)
                tp.SetValue(log, sp.GetValue(entity));
        }

        // 2. กำหนด Action property (must be string)
        var actionProp = typeof(TLog).GetProperty("Action");
        if (actionProp != null && actionProp.CanWrite)
            actionProp.SetValue(log, entry.State.ToString());

        // 3. กำหนด timestamp ถ้ามี CreatedDate หรือ LoggedAt
        var timeProp = typeof(TLog).GetProperty("Created")
                       ?? typeof(TLog).GetProperty("CreatedBy");
        if (timeProp != null && timeProp.CanWrite && timeProp.PropertyType == typeof(DateTime))
            timeProp.SetValue(log, DateTime.Now);

        // 4. add log entity ลง context
        context.Set<TLog>().Add(log);

        return entry;
    }

}
