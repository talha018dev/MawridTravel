# Mawrid Travels API

ASP.NET Core 10 Minimal API using Vertical Slice Architecture, EF Core, and
PostgreSQL.

## Local database configuration

Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Keep the development connection string outside Git using .NET user secrets:

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=mawrid_travel;Username=mawrid;Password=replace-with-your-local-password"
```

Alternatively, set `DATABASE_CONNECTION_STRING` in the process environment.

## Run

```bash
dotnet run
```

API liveness: `GET http://localhost:5000/api/health`

Database connectivity: `GET http://localhost:5000/api/health/database`

Interactive Scalar API reference: `http://localhost:5000/scalar`

The Scalar UI and its OpenAPI document are exposed only in the Development
environment.

The development CORS policy allows the Angular development and SSR origins at
`http://localhost:4200` and `http://localhost:4000`. Configure
`Cors__AllowedOrigins__0` (and subsequent numeric entries) for deployed origins.

## Product catalog API

Public catalog endpoints return active products only:

```text
GET /api/products?page=1&pageSize=20
GET /api/products/{slug}
```

The following endpoints require the `Admin` role:

```text
GET    /api/admin/products
GET    /api/admin/products/{id}
POST   /api/admin/products
PUT    /api/admin/products/{id}
DELETE /api/admin/products/{id}

POST   /api/admin/products/{id}/images?altText=...&isPrimary=true
PUT    /api/admin/products/{productId}/images/{imageId}
DELETE /api/admin/products/{productId}/images/{imageId}
```

Product image uploads use the image bytes as the request body with a
`Content-Type` of `image/jpeg`, `image/png`, or `image/webp`. Images are limited
to 5 MB and ten images per product. The API validates the declared type against
the file signature before uploading it.

### Cloudflare R2 image storage

Create an R2 bucket, grant an R2 API token object read/write access to that
bucket, and connect a public custom domain such as
`https://images.mawridtravel.com`. Configure these secrets on the API service:

```text
R2__AccountId=<cloudflare-account-id>
R2__AccessKeyId=<r2-access-key-id>
R2__SecretAccessKey=<r2-secret-access-key>
R2__BucketName=<bucket-name>
R2__PublicBaseUrl=https://images.mawridtravel.com
```

Do not add these values to the Angular/web service or commit them to Git. For
local development, use .NET user secrets with the same configuration keys.

## Tests

Run the API integration tests from the repository root:

```bash
dotnet test apps/api.tests/MawridTravel.Api.Tests.csproj
```

## Container image

Build the API image from the repository root:

```bash
docker build -t mawrid-travel-api apps/api
```

For normal local container development, start the API and PostgreSQL together
from the repository root:

```bash
docker compose up --build -d
```

Compose builds `DATABASE_CONNECTION_STRING` from the same `POSTGRES_DB`,
`POSTGRES_USER`, and `POSTGRES_PASSWORD` values in the root `.env` file. Inside
the Compose network, the API connects to the database using the service hostname
`postgres`.

## EF Core migrations

Apply existing migrations using the same production image as the API:

```bash
dotnet MawridTravel.Api.dll --migrate
```

Configure that command as Railway's API pre-deploy command. It applies pending
migrations and exits before Railway starts the new application deployment.

For local migration development, create migrations only as features introduce
persistent entities:

```bash
dotnet tool restore
dotnet ef migrations add <MigrationName> --output-dir Infrastructure/Persistence/Migrations
dotnet ef database update
```
