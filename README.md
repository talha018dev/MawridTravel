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

Set `API_BASE_URL` to the private API origin in deployed environments. The SSR
server proxies browser requests from `/api` to this origin, keeping browser API
traffic and authentication cookies on the web application's origin. For
example, Railway can use its API service's private network address:

```text
API_BASE_URL=http://api.railway.internal:8080
```

Build the production web container from the repository root:

```bash
docker build -t mawrid-travel-web apps/web
```

## API and PostgreSQL

Copy `.env.example` to `.env`, replace its development password, and start the
complete backend:

```bash
docker compose up --build -d
```

The API is available at `http://localhost:5000`. PostgreSQL remains private to
the Compose network, where the API reaches it as `postgres:5432`. Both services
use the PostgreSQL values from the same root `.env` file.

To run the API directly with `dotnet run` instead, follow
[apps/api/README.md](apps/api/README.md) to configure the matching connection
string with .NET user secrets.

See [PLAN.md](PLAN.md) for the full architecture and development phases.
