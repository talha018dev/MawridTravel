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

## Tests

Run the API integration tests from the repository root:

```bash
dotnet test apps/api.tests/MawridTravel.Api.Tests.csproj
```

## Container image

Build the API image from the repository root so the Docker build context contains
the API project:

```bash
docker build -f apps/api/Dockerfile -t mawrid-travel-api .
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

Create migrations only as features introduce persistent entities:

```bash
dotnet tool restore
dotnet ef migrations add <MigrationName> --output-dir Infrastructure/Persistence/Migrations
dotnet ef database update
```
