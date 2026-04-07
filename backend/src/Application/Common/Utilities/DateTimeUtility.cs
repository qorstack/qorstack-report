namespace QorstackReportService.Application.Common.Utilities;

/// <summary>
/// Utility class for DateTime operations
/// </summary>
public static class DateTimeUtility
{
    /// <summary>
    /// Extracts Year, Month, and Day from a DateTime
    /// </summary>
    /// <param name="dateTime">The DateTime to extract from</param>
    /// <returns>A tuple containing (Year, Month, Day) as strings</returns>
    public static (string Year, string Month, string Day) GetDateParts(DateTime? dateTime)
    {
        if (dateTime == null)
            return (string.Empty, string.Empty, string.Empty);

        return (
            Year: dateTime.Value.Year.ToString(),
            Month: dateTime.Value.Month.ToString().PadLeft(2, '0'),
            Day: dateTime.Value.Day.ToString().PadLeft(2, '0')
        );
    }

    /// <summary>
    /// Extracts Year, Month, and Day from a DateTime with zero-padded formatting
    /// </summary>
    /// <param name="dateTime">The DateTime to extract from</param>
    /// <returns>A tuple containing (Year, Month, Day) as zero-padded strings</returns>
    public static (string Year, string Month, string Day) GetDatePartsFormatted(DateTime? dateTime)
    {
        if (dateTime == null)
            return (string.Empty, string.Empty, string.Empty);

        return (
            Year: dateTime.Value.Year.ToString("0000"),
            Month: dateTime.Value.Month.ToString("00"),
            Day: dateTime.Value.Day.ToString("00")
        );
    }

    /// <summary>
    /// Creates a path-friendly date string in format "YYYY/MM"
    /// </summary>
    /// <param name="dateTime">The DateTime to format</param>
    /// <returns>A string in format "YYYY/MM" or empty string if null</returns>
    public static string GetYearMonthPath(DateTime? dateTime)
    {
        if (dateTime == null)
            return string.Empty;

        var (year, month, _) = GetDatePartsFormatted(dateTime);
        return $"{year}/{month}";
    }

    /// <summary>
    /// Creates a path-friendly date string in format "YYYY/MM/DD"
    /// </summary>
    /// <param name="dateTime">The DateTime to format</param>
    /// <returns>A string in format "YYYY/MM/DD" or empty string if null</returns>
    public static string GetYearMonthDayPath(DateTime? dateTime)
    {
        if (dateTime == null)
            return string.Empty;

        var (year, month, day) = GetDatePartsFormatted(dateTime);
        return $"{year}/{month}/{day}";
    }
}
