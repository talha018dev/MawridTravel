# Mawrid Travels - Project Plan

## 1. Project Overview

Mawrid Travels is a low-traffic travel and commerce web application with three primary customer-facing areas:

1. **Products / ordering** - customers can browse items and place orders.
2. **Blog** - public, SEO-friendly articles managed by administrators.
3. **Flight price requests** - customers can submit an origin, destination, and travel date range to request flight pricing information.

The application also includes an **admin area** for managing orders, flight requests, and blog content.

### Initial scale

- Expected initial traffic: approximately **50 users per day**.
- Architecture should remain simple and inexpensive initially while allowing future growth.
- Avoid unnecessary distributed-system complexity at this stage.

---

## 2. Confirmed Technology Stack

| Area | Technology |
|---|---|
| Repository | Monorepo |
| Frontend | Angular |
| Rendering | Angular SSR |
| Backend | ASP.NET Core Web API |
| Database | PostgreSQL |
| ORM | Entity Framework Core |
| Domain / DNS | Cloudflare |
| Initial hosting | Railway |
| Long-term hosting | Hetzner VPS |
| Source control | GitHub |
| Production packaging | Docker |
| Reverse proxy on Hetzner | Caddy or Nginx - final choice TBD |

### Why SSR is required

Angular SSR should be used for pages where SEO matters, especially:

- Home / landing pages
- Product listing and product detail pages
- Blog listing
- Blog article pages

Admin pages do not require SEO.

---

## 3. Repository Structure

Target structure:

```text
mawrid-travels/
├── apps/
│   ├── web/                         # Angular application
│   │   ├── src/
│   │   ├── angular.json
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── api/                         # ASP.NET Core API
│       ├── Features/
│       ├── Domain/
│       ├── Infrastructure/
│       ├── Program.cs
│       ├── MawridTravels.Api.csproj
│       └── Dockerfile
│
├── docker-compose.yml
├── .editorconfig
├── .gitignore
├── README.md
└── PLAN.md
```

The exact backend folder structure may evolve as development begins. Prefer feature-oriented organization over unnecessary architectural layers.

---

## 4. User Roles

Initial roles:

### Customer

A customer should be able to:

- Browse public pages.
- Browse products.
- View individual products.
- Place an order.
- Submit a flight price request.
- View published blog posts.
- Authenticate where required.
- View relevant personal order/request information if customer account functionality is included in the initial release.

### Admin

An administrator should be able to:

- Sign in to the protected admin area.
- View all orders.
- Update order status.
- View all flight price requests.
- Respond to / update flight requests.
- Create blog posts.
- Edit blog posts.
- Publish/unpublish blog posts.
- Manage products.

Admin authorization must be enforced by the backend. Hiding Angular routes or buttons alone is not sufficient security.

---

## 5. Authentication and Authorization

Use ASP.NET Core authentication and authorization.

Required concepts:

- Authenticated users
- Role-based authorization
- `Admin` role
- `Customer` role
- Protected backend endpoints
- Protected Angular admin routes

The API remains the final authority for authorization.

### Authentication mechanism - TBD

Choose before implementing authentication:

- Secure HTTP-only cookie authentication, or
- JWT-based authentication

For a first-party Angular web application and ASP.NET backend, secure cookie authentication should be evaluated before defaulting to JWT.

Passwords must never be stored directly. Use ASP.NET Core Identity or another established password hashing/authentication mechanism rather than custom password handling.

---

## 6. Product / Commerce Requirements

### Public product functionality

Customers should be able to:

- View available products/items.
- View product details.
- See price and availability/status.
- Submit an order.

### Initial product model

Likely fields:

```text
Product
- Id
- Name
- Slug
- Description
- Price
- ImageUrl / Image reference
- IsActive
- CreatedAt
- UpdatedAt
```

Final fields should be determined from the actual products being sold.

### Order model

Likely entities:

```text
Order
- Id
- CustomerId (nullable if guest checkout is supported)
- CustomerName
- Email
- Phone
- Status
- TotalAmount
- CreatedAt
- UpdatedAt

OrderItem
- Id
- OrderId
- ProductId
- ProductNameSnapshot
- UnitPrice
- Quantity
- LineTotal
```

Store product name/price snapshots on order items so historical orders do not change when the current product is edited.

### Initial order statuses

Proposed:

```text
Pending
Confirmed
Processing
Completed
Cancelled
```

Exact workflow is TBD.

### Payment

Online payment integration is **not yet confirmed**.

Do not implement a payment provider until requirements are finalized.

---

## 7. Flight Price Request Requirements

The customer-facing flight form should allow users to provide at minimum:

- Origin / From
- Destination / To
- Start date or departure date range
- End date or return date range
- Contact information where required

Potential additional fields:

- Number of passengers
- Adult/child/infant counts
- Cabin class
- One-way / round-trip
- Notes

These additional fields are TBD.

### Flight request workflow

Initial supported workflow:

```text
Customer submits request
        ↓
Request stored in PostgreSQL
        ↓
Admin sees request
        ↓
Admin checks flight pricing
        ↓
Admin enters response / quote
        ↓
Request status updated
```

A third-party flight API can be integrated later.

The architecture should therefore allow the pricing source to evolve from:

```text
Manual admin response
```

to:

```text
Third-party flight API
```

without redesigning the entire request domain.

### Proposed flight request statuses

```text
Pending
InReview
Quoted
Completed
Cancelled
```

Exact status names are TBD.

### Proposed entity

```text
FlightRequest
- Id
- CustomerId (optional depending on auth requirements)
- Origin
- Destination
- DepartureDateFrom
- DepartureDateTo
- ReturnDateFrom
- ReturnDateTo
- Status
- CustomerName
- Email
- Phone
- AdminResponse
- QuotedPrice
- CreatedAt
- UpdatedAt
```

Fields should be adjusted once the final form is designed.

---

## 8. Blog Requirements

The blog is an important SEO component.

### Public functionality

Users should be able to:

- View a list of published articles.
- Open individual articles through SEO-friendly URLs.
- Navigate directly to an article using its slug.

Example:

```text
/blog
/blog/best-time-to-visit-malaysia
```

### Admin functionality

Admins should be able to:

- Create posts.
- Edit posts.
- Save content.
- Publish/unpublish posts.
- Manage title and slug.
- Manage SEO metadata.

### Proposed BlogPost model

```text
BlogPost
- Id
- Title
- Slug
- Excerpt
- Content
- FeaturedImageUrl
- MetaTitle
- MetaDescription
- IsPublished
- PublishedAt
- CreatedAt
- UpdatedAt
- AuthorId
```

### SEO requirements

Blog pages should support:

- Server-side rendering.
- Unique page titles.
- Meta descriptions.
- Canonical URLs where appropriate.
- Semantic HTML.
- Open Graph metadata where useful.
- Sitemap generation.
- `robots.txt` configuration.
- Human-readable slugs.

Structured data can be added where appropriate.

---

## 9. Angular Frontend Architecture

The Angular application serves both the public site and protected admin UI.

Potential route structure:

```text
/
/products
/products/:slug
/blog
/blog/:slug
/flights
/login
/account/...

/admin
/admin/orders
/admin/orders/:id
/admin/flights
/admin/flights/:id
/admin/blog
/admin/blog/new
/admin/blog/:id/edit
/admin/products
```

### Frontend principles

- Use SSR where SEO/public content benefits from it.
- Avoid unnecessary SSR for admin-only screens.
- Keep API communication in dedicated services/data-access code.
- Use route guards for admin UX, while relying on backend authorization for security.
- Use typed request/response models.
- Provide loading, empty, success, and error states.
- Ensure responsive layouts.
- Use accessible semantic HTML and keyboard-friendly controls.

---

## 10. ASP.NET Core Backend Architecture

Use ASP.NET Core Web API with EF Core and PostgreSQL.

Prefer a pragmatic feature-based architecture.

Example:

```text
Features/
├── Auth/
├── Products/
├── Orders/
├── FlightRequests/
├── Blog/
└── Admin/
```

Each feature may contain its own:

- Endpoints/controllers
- Request DTOs
- Response DTOs
- Validation
- Business logic
- Queries/commands where useful

Do not introduce CQRS, MediatR, repositories, message brokers, microservices, or other abstractions solely for architectural purity. Add abstractions when they solve a real project need.

### API conventions

- Use appropriate HTTP methods and status codes.
- Validate incoming requests.
- Do not expose EF entities directly as public API contracts.
- Use DTOs.
- Use consistent error responses, preferably Problem Details.
- Support cancellation tokens for asynchronous request work where appropriate.
- Log operational failures without logging secrets or sensitive authentication data.

---

## 11. Initial Database Entities

Expected starting set:

```text
User / Identity tables
Role / Identity role tables

Product
Order
OrderItem

FlightRequest

BlogPost
```

Possible later additions:

```text
ProductCategory
ProductImage
Address
Payment
FlightQuote
BlogCategory
BlogTag
RefreshToken (only if required by auth design)
AuditLog
```

Do not create optional entities until the corresponding feature requires them.

---

## 12. PostgreSQL and EF Core

Requirements:

- PostgreSQL as the relational database.
- EF Core migrations committed to source control.
- Migrations applied as part of a controlled deployment process.
- Foreign keys and indexes defined intentionally.
- Unique indexes for values such as blog/product slugs where appropriate.
- Store timestamps consistently, preferably UTC.

Production data must be backed up before risky database changes.

---

## 13. File and Image Storage

Product and blog images should **not** be stored as large binary blobs directly in PostgreSQL unless there is a compelling reason.

Preferred architecture:

```text
Database
    ↓ stores URL/key
Object/file storage
    ↓
Image
```

Storage provider is TBD.

Possible future choices include Cloudflare R2 or another S3-compatible object store.

For the first release, choose the simplest storage solution that survives deployments and can later be migrated cleanly.

---

## 14. Environment Configuration

Do not hardcode environment-specific values.

Expected configuration includes:

```text
DATABASE_CONNECTION_STRING
FRONTEND_URL
API_URL
AUTH/JWT/COOKIE configuration
EMAIL configuration
STORAGE configuration
FLIGHT_API credentials (future)
```

Use separate configuration for:

```text
Development
Production
```

Secrets must not be committed to Git.

Use `.env`/secret management mechanisms appropriate to Angular tooling, ASP.NET user secrets for local backend secrets where appropriate, Railway variables initially, and server-side environment/secrets on Hetzner later.

---

## 15. Local Development

Expected development topology:

```text
Angular
localhost:4200
       ↓
ASP.NET API
localhost:<api-port>
       ↓
PostgreSQL
localhost:5432
```

PostgreSQL can run locally or through Docker.

A local `docker-compose.yml` may be used for infrastructure and later for production-style testing.

---

## 16. Docker Strategy

Containerize the applications from early development.

Required:

```text
apps/web/Dockerfile
apps/api/Dockerfile
```

Eventually:

```text
docker-compose.yml
```

should be capable of coordinating the production services needed on the VPS.

Benefits:

- Railway deployment can use containers.
- Hetzner migration becomes easier.
- Local and production environments become more consistent.
- Application code remains largely hosting-provider independent.

---

## 17. Initial Deployment - Railway

For approximately the first two weeks, deploy using Railway.

Target topology:

```text
Cloudflare
     ↓
Railway
├── Angular SSR service
├── ASP.NET API service
└── PostgreSQL
```

Possible domains:

```text
https://example.com        → Angular
https://api.example.com    → ASP.NET API
```

The actual Mawrid Travels domain will replace `example.com`.

### Railway goals

- Get production online quickly.
- Validate deployment configuration.
- Validate SSR in production.
- Validate domain/DNS configuration.
- Test the real customer/admin workflows.
- Avoid spending time managing a VPS before the application is functional.

---

## 18. Domain and DNS - Cloudflare

The domain remains registered/managed through Cloudflare.

Cloudflare is responsible for:

- Domain registration where applicable.
- DNS.
- Proxy/CDN capabilities where appropriate.
- TLS-related edge functionality.
- Additional security/caching features as needed.

The domain is independent from the hosting provider.

Therefore migration does **not** require transferring the domain.

Initial:

```text
Cloudflare DNS
      ↓
Railway
```

Later:

```text
Cloudflare DNS
      ↓
Hetzner VPS
```

Only the relevant DNS/routing configuration changes during migration.

---

## 19. Migration to Hetzner

After the initial Railway period, migrate to a Hetzner VPS when ready.

Target architecture:

```text
Internet
   ↓
Cloudflare
   ↓
Hetzner VPS
   ↓
Caddy / Nginx
   ├── example.com
   │       ↓
   │   Angular SSR container
   │
   └── api.example.com
           ↓
       ASP.NET container
           ↓
       PostgreSQL
```

### VPS services

Expected containers/services:

```text
web
api
postgres
```

Potential additions later:

```text
Redis
background worker
monitoring
object storage integration
```

Do not add these until needed.

### Migration checklist

1. Provision Hetzner VPS.
2. Secure server access.
3. Install Docker and required tooling.
4. Configure firewall.
5. Configure reverse proxy.
6. Deploy Angular container.
7. Deploy ASP.NET container.
8. Provision PostgreSQL.
9. Migrate Railway database data safely.
10. Configure production environment variables/secrets.
11. Test using temporary/internal routing before cutover where possible.
12. Update Cloudflare DNS/proxy configuration.
13. Verify TLS, SSR, API, authentication, orders, blog, and flight requests.
14. Monitor errors after cutover.
15. Keep Railway available briefly as rollback protection if practical.
16. Decommission Railway resources only after the Hetzner deployment is confirmed stable.

---

## 20. Reverse Proxy

Hetzner needs a reverse proxy in front of the application containers.

Candidates:

- Caddy
- Nginx

Final choice: **TBD**.

Responsibilities include:

- Route main-domain traffic to Angular SSR.
- Route API subdomain traffic to ASP.NET.
- Forward required HTTP headers.
- Integrate correctly with Cloudflare proxying.
- Apply sensible request/body limits and security configuration.

---

## 21. Security Requirements

Minimum security requirements:

- HTTPS only in production.
- Secure authentication cookies/tokens.
- Role authorization enforced server-side.
- Strong password hashing through established libraries/frameworks.
- Input validation.
- EF Core parameterization rather than manually concatenated SQL.
- Correct CORS configuration.
- CSRF protection when authentication design requires it.
- Appropriate XSS protections and safe rendering of blog content.
- Rate limiting on sensitive/public endpoints where appropriate.
- Secrets stored outside Git.
- Production error responses must not expose stack traces or secrets.
- Admin endpoints protected independently of frontend route guards.
- Database should not be publicly exposed unless explicitly necessary and secured.

Special care is required if blog content supports raw HTML or rich text. Admin-authored content must still be handled safely to prevent stored XSS.

---

## 22. Logging and Error Handling

Backend should use structured ASP.NET logging.

Use consistent API error responses with Problem Details where appropriate.

Log useful operational context such as:

- Unexpected exceptions
- External API failures
- Database failures
- Important background/deployment failures

Avoid logging:

- Passwords
- Authentication tokens
- Secrets
- Sensitive payment data

Production logging/monitoring provider is TBD.

---

## 23. Email / Notifications

The application may require email for:

- Order confirmation.
- Flight request acknowledgement.
- Flight quote/response notification.
- Admin notifications.
- Account/password workflows.

Email provider and exact notification requirements are **TBD**.

Email should be implemented behind an application-level service so providers can be changed without rewriting business workflows.

---

## 24. SEO Requirements

SEO matters primarily for public marketing, product, and blog content.

Requirements:

- Angular SSR.
- Correct page titles.
- Meta descriptions.
- Crawlable links.
- Semantic HTML.
- Sitemap.
- `robots.txt`.
- Canonical URLs where necessary.
- Stable human-readable slugs.
- Good Core Web Vitals where practical.
- Responsive pages.
- Appropriate image dimensions/optimization.

Admin and private account pages should not be indexed.

---

## 25. Performance Requirements

Given approximately 50 daily users initially, prioritize simplicity and correctness rather than premature scaling.

Initial architecture does **not** require:

- Kubernetes.
- Microservices.
- Kafka/RabbitMQ.
- Multiple application servers.
- Distributed caching.
- Complex event-driven architecture.

Optimize obvious issues such as:

- Oversized frontend bundles.
- Unoptimized images.
- N+1 database queries.
- Missing database indexes.
- Returning unnecessary API data.
- Blocking server operations.

Add infrastructure only when metrics demonstrate a need.

---

## 26. Backups

Before production launch, define a PostgreSQL backup strategy.

At minimum:

- Automated database backups.
- Retention policy.
- Restore procedure.
- Backup before major migrations.
- Verify that backups can actually be restored.

Railway and Hetzner backup capabilities/strategy should be reviewed separately before relying on them.

---

## 27. Testing Strategy

Minimum useful testing layers:

### Backend

- Unit tests for meaningful business rules.
- Integration tests for important API/database flows.
- Authorization tests for admin/customer boundaries.

### Frontend

- Unit tests where logic warrants them.
- Component tests for important interactive components where useful.
- End-to-end tests for critical flows.

### Critical end-to-end flows

Prioritize tests for:

```text
Admin login
Customer order submission
Admin order management
Flight request submission
Admin flight request response/update
Blog creation and publishing
Public blog rendering
Authorization boundaries
```

Do not chase arbitrary test coverage percentages.

---

## 28. CI/CD

Initial target:

```text
GitHub
   ↓
Automated build/test
   ↓
Deployment
```

CI should eventually verify at minimum:

- Angular builds successfully.
- ASP.NET builds successfully.
- Automated tests pass.
- Docker images build successfully.

Railway can provide the initial deployment workflow.

For Hetzner, deployment can later use GitHub Actions or another simple automated deployment mechanism.

Production deployment should not depend on manually copying application files to the server.

---

## 29. Development Phases

### Phase 0 - Foundation

- Create GitHub repository.
- Create monorepo structure.
- Create Angular application with SSR.
- Create ASP.NET Core API.
- Configure PostgreSQL.
- Configure EF Core.
- Add Dockerfiles.
- Add local environment configuration.
- Establish API/frontend communication.

### Phase 1 - Authentication and authorization

- Implement user authentication.
- Add Admin and Customer roles.
- Protect admin API endpoints.
- Protect admin Angular routes.
- Establish initial admin account strategy.

### Phase 2 - Products and orders

- Product entity/schema.
- Product admin CRUD.
- Public product listing.
- Product detail page.
- Order creation.
- Order items.
- Admin order list/detail.
- Order status updates.

### Phase 3 - Flight requests

- Flight request schema.
- Customer request form.
- Request validation.
- Admin request list/detail.
- Admin response/quote workflow.
- Request status management.

Start with manual admin pricing unless a flight API is confirmed earlier.

### Phase 4 - Blog

- Blog schema.
- Admin blog editor.
- Draft/publish workflow.
- Public blog listing.
- SSR blog detail page.
- SEO metadata.
- Sitemap/robots configuration.

### Phase 5 - Production hardening

- Error handling.
- Logging.
- Rate limiting where needed.
- Security review.
- Image/file storage.
- Email notifications if required for launch.
- Automated tests for critical workflows.
- Backup plan.

### Phase 6 - Railway launch

- Create Railway services.
- Deploy PostgreSQL.
- Deploy API.
- Deploy Angular SSR.
- Configure environment variables.
- Connect Cloudflare domain.
- Verify production SSR and SEO.
- Test complete customer/admin workflows.

### Phase 7 - Hetzner migration

- Provision VPS.
- Harden server.
- Install Docker.
- Configure Caddy/Nginx.
- Deploy containers.
- Migrate PostgreSQL data.
- Configure backups.
- Update Cloudflare routing.
- Verify production.
- Decommission Railway after stability is confirmed.

---

## 30. Deferred Features / Avoid Premature Implementation

Do not build these until requirements justify them:

- Microservices.
- Kubernetes.
- Redis.
- Message queues.
- Separate frontend/backend repositories.
- Dedicated search infrastructure.
- Automatic flight pricing integration before selecting a provider.
- Complex analytics infrastructure.
- Native mobile apps.
- Multi-region deployment.
- Advanced autoscaling.

The system should be structured so these can be introduced later without designing for hypothetical scale today.

---

## 31. Decisions Still Required

Before or during the relevant implementation phases, decide:

1. Exact domain name.
2. Cookie vs JWT authentication strategy.
3. Whether guest checkout is allowed.
4. Exact customer account functionality.
5. Payment method/provider, if online payment is needed.
6. Exact product fields/categories/inventory requirements.
7. Exact order statuses and workflow.
8. Exact flight request fields.
9. Exact flight request statuses/workflow.
10. Whether/when to integrate a third-party flight API.
11. Rich-text/Markdown strategy for blog editing.
12. Image/file storage provider.
13. Email provider.
14. Caddy vs Nginx for Hetzner.
15. Monitoring/log aggregation approach.
16. PostgreSQL backup implementation on Hetzner.
17. Whether PostgreSQL should run on the same VPS initially or use a managed database.

---

## 32. Core Architecture Principle

Keep the application portable between hosting providers.

Application code should depend on configuration rather than Railway- or Hetzner-specific assumptions:

```text
Application
   ↓
Environment configuration
   ↓
Infrastructure
```

This is what makes the intended migration straightforward:

```text
Development
    ↓
Railway
    ↓
Hetzner
```

The application remains Angular + ASP.NET Core + PostgreSQL throughout. Primarily the infrastructure and environment configuration change.

---

## 33. Definition of Initial Success

The first production version is successful when:

- The public site is reachable through the Cloudflare-managed domain.
- Angular SSR works correctly for SEO-sensitive pages.
- Products can be viewed and ordered.
- Orders are persisted and manageable by an admin.
- Flight requests can be submitted and handled by an admin.
- Blog posts can be created/published and rendered as crawlable SSR pages.
- Admin routes and endpoints are securely protected.
- PostgreSQL data persists safely.
- Errors are handled consistently.
- Critical workflows work on mobile and desktop.
- Production secrets are not committed to Git.
- There is a working database backup strategy.
- The application can be redeployed without manual reconstruction of its configuration.

