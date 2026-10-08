namespace MawridTravel.Api.Features.Orders;

internal static class OrderConstants
{
    public const string CashOnDelivery = "CashOnDelivery";
    public const string InsideDhaka = "InsideDhaka";
    public const string OutsideDhaka = "OutsideDhaka";
    public const decimal InsideDhakaDeliveryFee = 80m;
    public const decimal OutsideDhakaDeliveryFee = 130m;

    public static decimal GetDeliveryFee(string deliveryArea) =>
        deliveryArea == OutsideDhaka
            ? OutsideDhakaDeliveryFee
            : InsideDhakaDeliveryFee;

    public static class Statuses
    {
        public const string NotConfirmed = "NotConfirmed";
        public const string Confirmed = "Confirmed";
        public const string InProgress = "InProgress";
        public const string Completed = "Completed";
        public const string Failed = "Failed";

        public static readonly IReadOnlySet<string> All = new HashSet<string>(
            [NotConfirmed, Confirmed, InProgress, Completed, Failed],
            StringComparer.OrdinalIgnoreCase);
    }
}
