# System Design

<cite>
**Referenced Files in This Document**
- [Program.cs](file://Backend/PlusgrowWms.Api/Program.cs)
- [PlusgrowDbContext.cs](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs)
- [GenericRepository.cs](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs)
- [ProductsController.cs](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs)
- [AuthService.cs](file://Backend/PlusgrowWms.Api/Services/AuthService.cs)
- [Product.cs](file://Backend/PlusgrowWms.Api/Models/Product.cs)
- [User.cs](file://Backend/PlusgrowWms.Api/Models/User.cs)
- [Role.cs](file://Backend/PlusgrowWms.Api/Models/Role.cs)
- [ProductDto.cs](file://Backend/PlusgrowWms.Api/DTOs/ProductDto.cs)
- [App.tsx](file://Frontend/src/App.tsx)
- [WmsContext.tsx](file://Frontend/src/context/WmsContext.tsx)
- [mockApi.ts](file://Frontend/src/services/mockApi.ts)
- [api.ts](file://Frontend/src/types/api.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes the system design of PlusGrow WMS following clean architecture principles with four distinct layers: Presentation, Application, Domain, and Infrastructure. It explains how the React frontend communicates with the ASP.NET Core backend via RESTful APIs, documents centralized state management using WmsContext for cross-component data sharing, details the database design with Entity Framework Core and the repository pattern, and outlines system boundaries, component responsibilities, and data flow patterns. It also addresses scalability, performance optimization, and fault tolerance considerations.

## Project Structure
The solution is organized into two primary projects:
- Backend: ASP.NET Core web API implementing clean architecture layers and EF Core persistence.
- Frontend: React application with TypeScript, routing, lazy loading, and centralized state management.

```mermaid
graph TB
subgraph "Presentation Layer (Frontend)"
FE_App["App.tsx<br/>Routing & Providers"]
FE_Context["WmsContext.tsx<br/>Centralized State"]
FE_API["mockApi.ts<br/>Mock HTTP Client"]
FE_Types["api.ts<br/>API Types"]
end
subgraph "Application Layer (Backend)"
BE_Program["Program.cs<br/>DI, Middleware, CORS"]
BE_Services["AuthService.cs<br/>Auth Business Logic"]
BE_Controllers["ProductsController.cs<br/>REST Endpoints"]
end
subgraph "Domain Layer (Backend)"
BE_Models["Product.cs / User.cs / Role.cs<br/>Domain Entities"]
BE_DTOs["ProductDto.cs<br/>DTOs"]
end
subgraph "Infrastructure Layer (Backend)"
BE_DBContext["PlusgrowDbContext.cs<br/>EF Core Context"]
BE_Repo["GenericRepository.cs<br/>Repository Pattern"]
end
FE_App --> FE_Context
FE_Context --> FE_API
FE_App --> BE_Program
FE_API --> BE_Program
BE_Program --> BE_Services
BE_Program --> BE_Controllers
BE_Controllers --> BE_DBContext
BE_DBContext --> BE_Repo
BE_Services --> BE_DBContext
BE_Services --> BE_Repo
```

**Diagram sources**
- [Program.cs:1-107](file://Backend/PlusgrowWms.Api/Program.cs#L1-L107)
- [PlusgrowDbContext.cs:1-78](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L1-L78)
- [GenericRepository.cs:1-117](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L1-L117)
- [ProductsController.cs:1-117](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs#L1-L117)
- [AuthService.cs:1-236](file://Backend/PlusgrowWms.Api/Services/AuthService.cs#L1-L236)
- [Product.cs:1-65](file://Backend/PlusgrowWms.Api/Models/Product.cs#L1-L65)
- [User.cs:1-51](file://Backend/PlusgrowWms.Api/Models/User.cs#L1-L51)
- [Role.cs:1-31](file://Backend/PlusgrowWms.Api/Models/Role.cs#L1-L31)
- [ProductDto.cs:1-55](file://Backend/PlusgrowWms.Api/DTOs/ProductDto.cs#L1-L55)
- [App.tsx:1-172](file://Frontend/src/App.tsx#L1-L172)
- [WmsContext.tsx:1-234](file://Frontend/src/context/WmsContext.tsx#L1-L234)
- [mockApi.ts:1-32](file://Frontend/src/services/mockApi.ts#L1-L32)
- [api.ts:1-206](file://Frontend/src/types/api.ts#L1-L206)

**Section sources**
- [Program.cs:1-107](file://Backend/PlusgrowWms.Api/Program.cs#L1-L107)
- [App.tsx:1-172](file://Frontend/src/App.tsx#L1-L172)

## Core Components
- Presentation (Frontend):
  - Routing and navigation with React Router.
  - Centralized state via WmsContext for shared data across components.
  - Mock HTTP client for local development and testing.
  - Type-safe API response and request DTOs.

- Application (Backend):
  - Dependency injection and middleware registration.
  - Authentication service with JWT generation and password hashing.
  - REST controllers exposing CRUD and search endpoints.

- Domain (Backend):
  - Strongly typed domain entities (Product, User, Role) with EF Core attributes.
  - DTOs for request/response transfer.

- Infrastructure (Backend):
  - EF Core DbContext with snake_case table naming and unique/performance indexes.
  - Generic repository implementing common CRUD operations.

**Section sources**
- [WmsContext.tsx:1-234](file://Frontend/src/context/WmsContext.tsx#L1-L234)
- [mockApi.ts:1-32](file://Frontend/src/services/mockApi.ts#L1-L32)
- [Program.cs:1-107](file://Backend/PlusgrowWms.Api/Program.cs#L1-L107)
- [AuthService.cs:1-236](file://Backend/PlusgrowWms.Api/Services/AuthService.cs#L1-L236)
- [PlusgrowDbContext.cs:1-78](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L1-L78)
- [GenericRepository.cs:1-117](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L1-L117)
- [Product.cs:1-65](file://Backend/PlusgrowWms.Api/Models/Product.cs#L1-L65)
- [User.cs:1-51](file://Backend/PlusgrowWms.Api/Models/User.cs#L1-L51)
- [Role.cs:1-31](file://Backend/PlusgrowWms.Api/Models/Role.cs#L1-L31)
- [ProductDto.cs:1-55](file://Backend/PlusgrowWms.Api/DTOs/ProductDto.cs#L1-L55)

## Architecture Overview
Clean architecture layers and their responsibilities:
- Presentation: Renders UI, manages app-wide state, and orchestrates user interactions.
- Application: Encapsulates business rules, orchestrates use cases, and coordinates domain and infrastructure.
- Domain: Contains immutable business entities and invariants.
- Infrastructure: Provides persistence, external integrations, and reusable utilities.

```mermaid
graph TB
subgraph "Presentation"
UI["React Components<br/>Pages & Templates"]
State["WmsContext<br/>Shared State"]
Router["React Router<br/>Routing"]
end
subgraph "Application"
AuthSvc["AuthService<br/>Auth Orchestration"]
Ctlr["ProductsController<br/>REST API"]
end
subgraph "Domain"
EntProd["Product"]
EntUser["User"]
EntRole["Role"]
DTOs["DTOs"]
end
subgraph "Infrastructure"
Ctx["PlusgrowDbContext<br/>EF Core"]
Repo["GenericRepository<br/>CRUD"]
end
UI --> State
UI --> Router
State --> Ctlr
Ctlr --> Ctx
AuthSvc --> Ctx
AuthSvc --> Repo
Ctx --> Repo
EntProd --> DTOs
EntUser --> DTOs
EntRole --> DTOs
```

**Diagram sources**
- [App.tsx:1-172](file://Frontend/src/App.tsx#L1-L172)
- [WmsContext.tsx:1-234](file://Frontend/src/context/WmsContext.tsx#L1-L234)
- [AuthService.cs:1-236](file://Backend/PlusgrowWms.Api/Services/AuthService.cs#L1-L236)
- [ProductsController.cs:1-117](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs#L1-L117)
- [PlusgrowDbContext.cs:1-78](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L1-L78)
- [GenericRepository.cs:1-117](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L1-L117)
- [Product.cs:1-65](file://Backend/PlusgrowWms.Api/Models/Product.cs#L1-L65)
- [User.cs:1-51](file://Backend/PlusgrowWms.Api/Models/User.cs#L1-L51)
- [Role.cs:1-31](file://Backend/PlusgrowWms.Api/Models/Role.cs#L1-L31)
- [ProductDto.cs:1-55](file://Backend/PlusgrowWms.Api/DTOs/ProductDto.cs#L1-L55)

## Detailed Component Analysis

### Frontend: Centralized State Management with WmsContext
WmsContext provides a single source of truth for inventory and transactional data across components. It loads initial datasets concurrently, exposes mutation helpers for stock updates, invoice lifecycle transitions, and bin assignment/clearing, and maintains an activity log.

```mermaid
flowchart TD
Start(["Load Data"]) --> Parallel["Parallel fetch of Products, Customers,<br/>Purchase/Sales Invoices, Stock, Activities"]
Parallel --> SetState["Set state in WmsContext"]
SetState --> Ready(["Ready for UI"])
Ready --> Mutations{"User Actions?"}
Mutations --> |Stock Update| UpdateStock["updateStock(sku, qtyChange, desc)"]
Mutations --> |Add/Update Invoices| InvoiceOps["add/update invoice status"]
Mutations --> |Assign/Clear Bin| BinOps["assignBin / clearBin"]
UpdateStock --> Activity["addActivity(type, description)"]
InvoiceOps --> Activity
BinOps --> Activity
Activity --> UIRefresh["Components re-render with new state"]
```

**Diagram sources**
- [WmsContext.tsx:37-214](file://Frontend/src/context/WmsContext.tsx#L37-L214)

**Section sources**
- [WmsContext.tsx:1-234](file://Frontend/src/context/WmsContext.tsx#L1-L234)
- [mockApi.ts:1-32](file://Frontend/src/services/mockApi.ts#L1-L32)
- [api.ts:1-206](file://Frontend/src/types/api.ts#L1-L206)

### Backend: RESTful API Communication Flow
The frontend interacts with the backend through REST endpoints. The example below illustrates the product retrieval flow.

```mermaid
sequenceDiagram
participant UI as "React Component"
participant C as "ProductsController"
participant DB as "PlusgrowDbContext"
participant R as "GenericRepository"
UI->>C : GET /api/products
C->>DB : Query Products with Includes
DB-->>C : Product list (with related entities)
C-->>UI : ApiResponse<List<Product>>
```

**Diagram sources**
- [ProductsController.cs:20-29](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs#L20-L29)
- [PlusgrowDbContext.cs:12-18](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L12-L18)

**Section sources**
- [ProductsController.cs:1-117](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs#L1-L117)
- [PlusgrowDbContext.cs:1-78](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L1-L78)

### Backend: Authentication Service and JWT
The authentication service handles login, registration, password hashing, and JWT token generation. It integrates with the repository layer for user persistence and logging for observability.

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant AC as "AuthService"
participant UR as "IUserRepository"
participant DB as "PlusgrowDbContext"
FE->>AC : Login(username, password)
AC->>UR : GetByUsernameAsync(username)
UR->>DB : Query User
DB-->>UR : User entity
UR-->>AC : User
AC->>AC : VerifyPassword()
AC->>AC : GenerateJwtToken(user)
AC-->>FE : AuthResponseDto { token, user }
```

**Diagram sources**
- [AuthService.cs:39-103](file://Backend/PlusgrowWms.Api/Services/AuthService.cs#L39-L103)
- [User.cs:1-51](file://Backend/PlusgrowWms.Api/Models/User.cs#L1-L51)

**Section sources**
- [AuthService.cs:1-236](file://Backend/PlusgrowWms.Api/Services/AuthService.cs#L1-L236)
- [User.cs:1-51](file://Backend/PlusgrowWms.Api/Models/User.cs#L1-L51)

### Backend: Entity Framework Core and Repository Pattern
The domain layer defines entities with table/column attributes. The DbContext configures snake_case naming and unique/performance indexes. The repository pattern abstracts data access for reuse across services.

```mermaid
classDiagram
class Product {
+int Id
+string Name
+string? Sku
+string? HsnCode
+int? CommodityId
+Commodity? Commodity
+string? CountryOfOrigin
+string? MrpQuantity
+decimal? Factor
+string? UnitType
+decimal? Ussp
+decimal? Mrp
+int BestBeforeMonths
+int? ManufacturerId
+Manufacturer? Manufacturer
+DateTime CreatedAt
}
class User {
+int Id
+string Username
+string PasswordHash
+string FullName
+string? Email
+string? Phone
+int? RoleId
+Role? Role
+bool IsActive
+DateTime CreatedAt
+DateTime? LastLoginAt
}
class Role {
+int Id
+string Name
+string? Description
+bool IsActive
+DateTime CreatedAt
+ICollection<User> Users
+ICollection<RolePageAccess> RolePageAccesses
}
Product --> Commodity : "belongs to"
Product --> Manufacturer : "belongs to"
User --> Role : "has role"
```

**Diagram sources**
- [Product.cs:1-65](file://Backend/PlusgrowWms.Api/Models/Product.cs#L1-L65)
- [User.cs:1-51](file://Backend/PlusgrowWms.Api/Models/User.cs#L1-L51)
- [Role.cs:1-31](file://Backend/PlusgrowWms.Api/Models/Role.cs#L1-L31)

**Section sources**
- [PlusgrowDbContext.cs:1-78](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L1-L78)
- [GenericRepository.cs:1-117](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L1-L117)
- [Product.cs:1-65](file://Backend/PlusgrowWms.Api/Models/Product.cs#L1-L65)
- [User.cs:1-51](file://Backend/PlusgrowWms.Api/Models/User.cs#L1-L51)
- [Role.cs:1-31](file://Backend/PlusgrowWms.Api/Models/Role.cs#L1-L31)

### Frontend: Routing and Protected Routes
The frontend uses React Router with lazy-loaded routes and a ProtectedRoute wrapper that checks authentication state before rendering protected pages.

```mermaid
flowchart TD
Root["App.tsx"] --> Routes["Routes"]
Routes --> Public["/login, /register"]
Routes --> Protected["/dashboard and other routes"]
Protected --> Guard{"isAuthenticated?"}
Guard --> |No| Redirect["Navigate to /login"]
Guard --> |Yes| Layout["DashboardLayout"]
Layout --> Pages["Lazy loaded pages"]
```

**Diagram sources**
- [App.tsx:34-53](file://Frontend/src/App.tsx#L34-L53)
- [App.tsx:65-171](file://Frontend/src/App.tsx#L65-L171)

**Section sources**
- [App.tsx:1-172](file://Frontend/src/App.tsx#L1-L172)

## Dependency Analysis
- Frontend depends on:
  - WmsContext for state.
  - mockApi for HTTP operations during development.
  - React Router for navigation.
  - TanStack React Query for caching and background fetching.

- Backend depends on:
  - EF Core for ORM and migrations.
  - FluentValidation for model validation.
  - AutoMapper for DTO mapping.
  - Serilog for structured logging.
  - JWT bearer authentication.

```mermaid
graph LR
FE_Mock["mockApi.ts"] --> BE_Program["Program.cs"]
FE_App["App.tsx"] --> FE_Context["WmsContext.tsx"]
FE_Context --> FE_Mock
BE_Program --> BE_Controllers["ProductsController.cs"]
BE_Program --> BE_Services["AuthService.cs"]
BE_Controllers --> BE_DB["PlusgrowDbContext.cs"]
BE_Services --> BE_DB
BE_DB --> BE_Repo["GenericRepository.cs"]
```

**Diagram sources**
- [Program.cs:1-107](file://Backend/PlusgrowWms.Api/Program.cs#L1-L107)
- [PlusgrowDbContext.cs:1-78](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L1-L78)
- [GenericRepository.cs:1-117](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L1-L117)
- [ProductsController.cs:1-117](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs#L1-L117)
- [AuthService.cs:1-236](file://Backend/PlusgrowWms.Api/Services/AuthService.cs#L1-L236)
- [App.tsx:1-172](file://Frontend/src/App.tsx#L1-L172)
- [WmsContext.tsx:1-234](file://Frontend/src/context/WmsContext.tsx#L1-L234)
- [mockApi.ts:1-32](file://Frontend/src/services/mockApi.ts#L1-L32)

**Section sources**
- [Program.cs:1-107](file://Backend/PlusgrowWms.Api/Program.cs#L1-L107)
- [App.tsx:1-172](file://Frontend/src/App.tsx#L1-L172)

## Performance Considerations
- Frontend:
  - Concurrent data loading reduces initial render latency.
  - React Query caching with a 5-minute stale threshold balances freshness and performance.
  - Lazy loading pages improves bundle sizes and first paint.

- Backend:
  - Unique and composite indexes improve lookup performance for entities like Product.Sku, User.Username, Role.Name, and RolePageAccess.RoleId+PageKey.
  - Snake_case table naming aligns with PostgreSQL conventions and improves readability.
  - Generic repository centralizes common operations and reduces duplication.

- Scalability:
  - Stateless controllers and repository pattern enable horizontal scaling.
  - JWT-based authentication avoids server-side session storage.
  - CORS configured for controlled frontend origin.

- Fault Tolerance:
  - Validation via FluentValidation prevents invalid data entry.
  - Logging via Serilog supports diagnostics and monitoring.
  - Controlled middleware order ensures proper request processing.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Authentication failures:
  - Verify JWT issuer, audience, and signing key configuration.
  - Confirm user IsActive flag and password hash verification.

- Data inconsistencies:
  - Ensure unique indexes are respected to prevent duplicates.
  - Validate DTO mapping and entity relationships.

- Frontend state anomalies:
  - Check WmsContext mutation functions for correct state updates.
  - Confirm mockApi delays and error handling for network issues.

**Section sources**
- [Program.cs:44-62](file://Backend/PlusgrowWms.Api/Program.cs#L44-L62)
- [AuthService.cs:39-103](file://Backend/PlusgrowWms.Api/Services/AuthService.cs#L39-L103)
- [PlusgrowDbContext.cs:31-76](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L31-L76)
- [WmsContext.tsx:83-118](file://Frontend/src/context/WmsContext.tsx#L83-L118)

## Conclusion
PlusGrow WMS follows clean architecture with clear separation of concerns. The React frontend leverages centralized state and a mock HTTP client for development, while the ASP.NET Core backend provides robust authentication, REST endpoints, and EF Core persistence with repository abstractions. The system is designed for maintainability, scalability, and operability, with performance optimizations and fault tolerance mechanisms built-in.