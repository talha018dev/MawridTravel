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

## EF Core migrations

Create migrations only as features introduce persistent entities:

```bash
dotnet tool restore
dotnet ef migrations add <MigrationName> --output-dir Infrastructure/Persistence/Migrations
dotnet ef database update
```
