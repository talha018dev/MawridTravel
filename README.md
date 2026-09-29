# Mawrid Travels

Mawrid Travels is organized as a monorepo containing the public/admin Angular
application and the ASP.NET Core API.

## Repository layout

```text
apps/
  web/  Angular application with SSR and Tailwind CSS
  api/  ASP.NET Core Minimal API with EF Core and PostgreSQL
```

## Web application

Requirements:

- Node.js 24.15 or newer
- npm 11 or newer

From `apps/web`:

```bash
npm install
npm start
```

The development server is available at `http://localhost:4200`.

Build and run the production SSR server:

```bash
npm run build
npm run serve:ssr:web
```

The production server listens on `http://localhost:4000` by default.

## API and PostgreSQL

Copy `.env.example` to `.env`, replace its development password, and start the
database:

```bash
docker compose up -d postgres
```

Then follow [apps/api/README.md](apps/api/README.md) to configure the matching
connection string with .NET user secrets and run the API.

See [PLAN.md](PLAN.md) for the full architecture and development phases.
