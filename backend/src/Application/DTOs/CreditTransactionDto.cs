namespace QorstackReportService.Application.DTOs
{
    public class CreditTransactionDto
    {
        public required Guid Id { get; set; }
        public required Guid UserId { get; set; }
        public Guid? PaymentId { get; set; }
        public required string TransactionType { get; set; }
        public required int Amount { get; set; }
        public required int BalanceAfter { get; set; }
        public string? ReferenceId { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedDatetime { get; set; }
        public string? UpdatedBy { get; set; }
        public DateTime? UpdatedDatetime { get; set; }
    }
}
