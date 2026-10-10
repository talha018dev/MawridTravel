using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MawridTravel.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SplitBanglaQrPaymentStates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE \"Orders\" SET \"PaymentMethod\" = 'PaidBanglaQr' WHERE \"PaymentMethod\" = 'BanglaQr';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE \"Orders\" SET \"PaymentMethod\" = 'BanglaQr' WHERE \"PaymentMethod\" IN ('UnpaidBanglaQr', 'PaidBanglaQr');");
        }
    }
}
