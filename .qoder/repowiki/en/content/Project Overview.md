# Project Overview

<cite>
**Referenced Files in This Document**
- [Program.cs](file://Backend/PlusgrowWms.Api/Program.cs)
- [PlusgrowWms.Api.csproj](file://Backend/PlusgrowWms.Api/PlusgrowWms.Api.csproj)
- [ProductsController.cs](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs)
- [PlusgrowDbContext.cs](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs)
- [GenericRepository.cs](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs)
- [App.tsx](file://Frontend/src/App.tsx)
- [package.json](file://Frontend/package.json)
- [PutAway.tsx](file://Frontend/src/pages/PutAway/PutAway.tsx)
- [WmsContext.tsx](file://Frontend/src/context/WmsContext.tsx)
- [mockApi.ts](file://Frontend/src/services/mockApi.ts)
- [vite.config.ts](file://Frontend/vite.config.ts)
- [Product.cs](file://Backend/PlusgrowWms.Api/Models/Product.cs)
- [api.ts](file://Frontend/src/lib/api/index.ts)
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
PlusGrow WMS is a modern warehouse management system designed to streamline logistics and inventory operations for distribution centers and warehouses. The platform focuses on operational excellence through real-time inventory tracking, efficient put-away workflows, stock movement management, and seamless barcode integration. Built with a clean separation between a robust ASP.NET Core 10 backend and a responsive React 19 frontend, PlusGrow WMS delivers a scalable, maintainable, and developer-friendly solution tailored for warehouse environments.

The system targets logistics managers, warehouse supervisors, and operations teams who need reliable tools to manage inbound/outbound flows, optimize storage allocation, and maintain accurate inventory visibility. It supports practical workflows such as receiving goods, assigning storage locations, tracking stock movements, and generating actionable insights through integrated dashboards and reports.

## Project Structure
The repository follows a clear separation of concerns:
- Backend: ASP.NET Core 10 web API with Entity Framework Core, PostgreSQL persistence, JWT authentication, and Swagger documentation.
- Frontend: React 19 application with TypeScript, Vite build tooling, TanStack React Query for data fetching, and a modular component architecture.

```mermaid
graph TB
subgraph "Backend (ASP.NET Core 10)"
A_Program["Program.cs<br/>Startup & DI"]
A_ApiProj["PlusgrowWms.Api.csproj<br/>NuGet packages"]
A_DbContext["PlusgrowDbContext.cs<br/>EF Core models & indexes"]
A_Repo["GenericRepository.cs<br/>CRUD abstraction"]
A_Ctrl["ProductsController.cs<br/>REST endpoints"]
end
subgraph "Frontend (React 19)"
F_App["App.tsx<br/>Routing & providers"]
F_PutAway["PutAway.tsx<br/>Put-away workflow"]
F_Context["WmsContext.tsx<br/>Global state & actions"]
F_Mock["mockApi.ts<br/>Mock data service"]
F_Config["vite.config.ts<br/>Build & dev server"]
end
F_App --> F_Context
F_Context --> F_PutAway
F_Context --> F_Mock
F_App --> A_Ctrl
A_Program --> A_DbContext
A_DbContext --> A_Repo
A_Repo --> A_Ctrl
```

**Diagram sources**
- [Program.cs:1-107](file://Backend/PlusgrowWms.Api/Program.cs#L1-L107)
- [PlusgrowWms.Api.csproj:1-29](file://Backend/PlusgrowWms.Api/PlusgrowWms.Api.csproj#L1-L29)
- [PlusgrowDbContext.cs:1-78](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L1-L78)
- [GenericRepository.cs:1-117](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L1-L117)
- [ProductsController.cs:1-86](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs#L1-L86)
- [App.tsx:1-119](file://Frontend/src/App.tsx#L1-L119)
- [PutAway.tsx:1-462](file://Frontend/src/pages/PutAway/PutAway.tsx#L1-L462)
- [WmsContext.tsx:1-234](file://Frontend/src/context/WmsContext.tsx#L1-L234)
- [mockApi.ts:1-32](file://Frontend/src/services/mockApi.ts#L1-L32)
- [vite.config.ts:1-25](file://Frontend/vite.config.ts#L1-L25)

**Section sources**
- [Program.cs:1-107](file://Backend/PlusgrowWms.Api/Program.cs#L1-L107)
- [PlusgrowWms.Api.csproj:1-29](file://Backend/PlusgrowWms.Api/PlusgrowWms.Api.csproj#L1-L29)
- [App.tsx:1-119](file://Frontend/src/App.tsx#L1-L119)
- [vite.config.ts:1-25](file://Frontend/vite.config.ts#L1-L25)

## Core Components
- Real-time inventory tracking: The frontend maintains a centralized stock state and updates it in response to warehouse actions (inward receipts, dispatches, and put-away assignments). Activities are logged for auditability.
- Put-away operations: The PutAway workflow guides users through selecting SKUs, scanning barcodes, choosing storage locations, and confirming allocations with immediate visual feedback.
- Stock movement management: The system supports adding and removing stock quantities, moving between unassigned and bin locations, and clearing bins back to unassigned stock.
- Barcode integration: The PutAway page simulates barcode scanning and verification, enabling quick and accurate identification of inventory items during put-away.
- Master data management: REST endpoints expose CRUD operations for products, manufacturers, importers, commodities, roles, and users, backed by a strongly typed model layer and EF Core.

Practical examples:
- Receiving inbound goods: Create a purchase invoice, mark it as completed, and watch stock quantities update in real time.
- Optimizing storage: Assign unassigned inventory to specific racks/shelves/bins to improve picking efficiency.
- Dispatch fulfillment: Create a sales invoice, mark it as dispatched, and observe stock reductions across the warehouse.

**Section sources**
- [WmsContext.tsx:83-194](file://Frontend/src/context/WmsContext.tsx#L83-L194)
- [PutAway.tsx:139-202](file://Frontend/src/pages/PutAway/PutAway.tsx#L139-L202)
- [ProductsController.cs:19-82](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs#L19-L82)
- [Product.cs:6-64](file://Backend/PlusgrowWms.Api/Models/Product.cs#L6-L64)

## Architecture Overview
PlusGrow WMS employs a layered architecture separating presentation, business logic, and data access:
- Presentation Layer (React 19): Handles routing, UI composition, state management, and user interactions.
- Application Layer (ASP.NET Core): Provides REST APIs, authentication, validation, and logging.
- Data Access Layer (EF Core + PostgreSQL): Manages entity models, database schema, and repository abstractions.

```mermaid
graph TB
UI["React 19 UI<br/>App.tsx, Pages, Context"]
API["ASP.NET Core 10 API<br/>Controllers, Services"]
REPO["Repository Pattern<br/>GenericRepository"]
DB["PostgreSQL<br/>PlusgrowDbContext"]
UI --> API
API --> REPO
REPO --> DB
```

**Diagram sources**
- [App.tsx:39-118](file://Frontend/src/App.tsx#L39-L118)
- [Program.cs:25-42](file://Backend/PlusgrowWms.Api/Program.cs#L25-L42)
- [GenericRepository.cs:22-116](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L22-L116)
- [PlusgrowDbContext.cs:6-18](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L6-L18)

**Section sources**
- [Program.cs:25-102](file://Backend/PlusgrowWms.Api/Program.cs#L25-L102)
- [PlusgrowDbContext.cs:20-76](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L20-L76)
- [GenericRepository.cs:7-20](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L7-L20)

## Detailed Component Analysis

### Backend Technology Stack and Setup
- ASP.NET Core 10: Minimal hosting model with Serilog logging, JWT Bearer authentication, FluentValidation, AutoMapper, and Swagger/OpenAPI.
- Entity Framework Core: PostgreSQL provider with custom model configuration and unique/performance indexes.
- Dependency Injection: Scoped services for repositories and business services; generic repository pattern for reusable data access.

```mermaid
classDiagram
class Program {
+ConfigureServices()
+ConfigurePipeline()
}
class PlusgrowDbContext {
+DbSet~Product~
+DbSet~Commodity~
+DbSet~Manufacturer~
+DbSet~User~
+OnModelCreating()
}
class GenericRepository~T~ {
+GetAllAsync()
+GetByIdAsync()
+AddAsync()
+UpdateAsync()
+DeleteAsync()
}
class ProductsController {
+GetProducts()
+GetProduct(id)
+CreateProduct()
+UpdateProduct()
+DeleteProduct()
}
Program --> PlusgrowDbContext : "registers"
PlusgrowDbContext --> GenericRepository~T~ : "used by"
ProductsController --> PlusgrowDbContext : "uses"
```

**Diagram sources**
- [Program.cs:25-102](file://Backend/PlusgrowWms.Api/Program.cs#L25-L102)
- [PlusgrowDbContext.cs:6-76](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L6-L76)
- [GenericRepository.cs:22-116](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L22-L116)
- [ProductsController.cs:10-85](file://Backend/PlusgrowWms.Api/Controllers/ProductsController.cs#L10-85)

**Section sources**
- [Program.cs:16-106](file://Backend/PlusgrowWms.Api/Program.cs#L16-L106)
- [PlusgrowWms.Api.csproj:9-26](file://Backend/PlusgrowWms.Api/PlusgrowWms.Api.csproj#L9-L26)
- [PlusgrowDbContext.cs:20-76](file://Backend/PlusgrowWms.Api/Data/PlusgrowDbContext.cs#L20-L76)
- [GenericRepository.cs:7-116](file://Backend/PlusgrowWms.Api/Repositories/GenericRepository.cs#L7-L116)

### Frontend Technology Stack and Routing
- React 19 with TypeScript: Strongly typed models mirror backend entities and DTOs.
- Vite: Fast development server and optimized builds with Tailwind CSS integration.
- TanStack React Query: Centralized caching, background updates, and optimistic UI patterns.
- Mock API: Standalone service simulating backend responses during development.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant Router as "React Router"
participant Provider as "WmsProvider"
participant Page as "PutAway Page"
participant Mock as "mockApi"
Browser->>Router : Navigate to "/putaway"
Router->>Provider : Wrap app with providers
Provider->>Mock : Load initial data (products, stock, invoices)
Mock-->>Provider : Return mock datasets
Provider-->>Page : Provide context state/actions
Page->>Page : Compute tasks, handle steps, assign bins
Page->>Provider : updateStock()/assignBin()
Provider-->>Page : Updated state + activity logs
```

**Diagram sources**
- [App.tsx:39-118](file://Frontend/src/App.tsx#L39-L118)
- [WmsContext.tsx:37-71](file://Frontend/src/context/WmsContext.tsx#L37-L71)
- [PutAway.tsx:65-101](file://Frontend/src/pages/PutAway/PutAway.tsx#L65-L101)
- [mockApi.ts:6-31](file://Frontend/src/services/mockApi.ts#L6-L31)

**Section sources**
- [App.tsx:14-118](file://Frontend/src/App.tsx#L14-L118)
- [package.json:13-59](file://Frontend/package.json#L13-L59)
- [vite.config.ts:6-24](file://Frontend/vite.config.ts#L6-L24)
- [WmsContext.tsx:28-224](file://Frontend/src/context/WmsContext.tsx#L28-L224)
- [PutAway.tsx:47-219](file://Frontend/src/pages/PutAway/PutAway.tsx#L47-L219)

### Put-Away Workflow Logic
The PutAway page orchestrates a four-step workflow:
1. Select a task (SKU with pending unassigned quantity).
2. Scan barcode (simulated verification).
3. Choose a storage location (rack/shelf/bin).
4. Confirm assignment with quantity selection and immediate feedback.

```mermaid
flowchart TD
Start(["User selects SKU"]) --> Scan["Scan barcode"]
Scan --> |Success| Location["Select location (rack/shelf/bin)"]
Scan --> |Failure| Retry["Show error and reset"]
Location --> Confirm["Confirm quantity and assign bin"]
Confirm --> Update["Update stock state (unassigned → bin)"]
Update --> Next["Proceed to next task or show completion"]
Retry --> Scan
```

**Diagram sources**
- [PutAway.tsx:139-202](file://Frontend/src/pages/PutAway/PutAway.tsx#L139-L202)
- [WmsContext.tsx:160-194](file://Frontend/src/context/WmsContext.tsx#L160-L194)

**Section sources**
- [PutAway.tsx:139-202](file://Frontend/src/pages/PutAway/PutAway.tsx#L139-L202)
- [WmsContext.tsx:160-194](file://Frontend/src/context/WmsContext.tsx#L160-L194)

### Data Model Alignment
The frontend types align with backend models and database column naming conventions, ensuring consistent serialization/deserialization across the API boundary.

```mermaid
erDiagram
PRODUCT {
int id PK
string name
string sku
string hsn_code
int commodity_id
string country_of_origin
string mrp_quantity
decimal factor
string unit_type
decimal ussp
decimal mrp
int best_before_months
int manufacturer_id
datetime created_at
}
COMMODITY {
int id PK
string name UK
}
MANUFACTURER {
int id PK
string name
string country
datetime created_at
}
PRODUCT }o--|| COMMODITY : "belongs to"
PRODUCT }o--|| MANUFACTURER : "belongs to"
```

**Diagram sources**
- [Product.cs:6-64](file://Backend/PlusgrowWms.Api/Models/Product.cs#L6-L64)
- [api.ts:60-94](file://Frontend/src/types/api.ts#L60-L94)

**Section sources**
- [Product.cs:6-64](file://Backend/PlusgrowWms.Api/Models/Product.cs#L6-L64)
- [api.ts:60-94](file://Frontend/src/types/api.ts#L60-L94)

## Dependency Analysis
- Backend dependencies include EF Core, Npgsql, Serilog, FluentValidation, AutoMapper, JWT Bearer, and Swashbuckle for API documentation.
- Frontend dependencies include React 19, React Router, TanStack React Query/Table, Axios, Sonner for notifications, JSBarcode for barcode rendering, and Tailwind CSS for styling.

```mermaid
graph LR
subgraph "Backend Packages"
BE_EF["Npgsql.EntityFrameworkCore.PostgreSQL"]
BE_JWT["Microsoft.AspNetCore.Authentication.JwtBearer"]
BE_Serilog["Serilog.AspNetCore"]
BE_Fluent["FluentValidation.AspNetCore"]
BE_AutoMapper["AutoMapper.Extensions.Microsoft.DependencyInjection"]
BE_Swash["Swashbuckle.AspNetCore"]
end
subgraph "Frontend Packages"
FE_R19["react@^19.0.0"]
FE_Router["react-router-dom@^7.13.2"]
FE_Query["@tanstack/react-query@^5.95.2"]
FE_Table["@tanstack/react-table@^8.21.3"]
FE_Axios["axios@^1.7.9"]
FE_Sonner["sonner@^2.0.7"]
FE_Barcode["jsbarcode@^3.12.3"]
FE_Tailwind["tailwindcss@^4.1.14"]
end
```

**Diagram sources**
- [PlusgrowWms.Api.csproj:9-26](file://Backend/PlusgrowWms.Api/PlusgrowWms.Api.csproj#L9-L26)
- [package.json:13-59](file://Frontend/package.json#L13-L59)

**Section sources**
- [PlusgrowWms.Api.csproj:9-26](file://Backend/PlusgrowWms.Api/PlusgrowWms.Api.csproj#L9-L26)
- [package.json:13-59](file://Frontend/package.json#L13-L59)

## Performance Considerations
- Database indexing: Unique and composite indexes on frequently queried columns (SKU, commodity ID, manufacturer ID, user role, etc.) improve query performance.
- Caching and stale-time: React Query is configured with a moderate stale time to balance freshness and network usage.
- Lazy loading: React Router lazy routes reduce initial bundle size and improve startup performance.
- Build optimization: Vite provides fast HMR and optimized production builds.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Authentication failures: Verify JWT issuer, audience, and signing key configuration in the backend and ensure the frontend sends Authorization headers correctly.
- CORS issues: Confirm the frontend origin is allowed in the backend CORS policy.
- Database connectivity: Ensure the connection string is present and the PostgreSQL service is reachable.
- API documentation: Swagger UI is enabled in development; validate endpoint availability and request/response shapes.
- Frontend data loading: If mock data does not appear, check the mock API delays and console errors for promise rejections.

**Section sources**
- [Program.cs:44-83](file://Backend/PlusgrowWms.Api/Program.cs#L44-L83)
- [Program.cs:87-102](file://Backend/PlusgrowWms.Api/Program.cs#L87-L102)
- [vite.config.ts:18-22](file://Frontend/vite.config.ts#L18-L22)

## Conclusion
PlusGrow WMS delivers a pragmatic, scalable solution for warehouse operations by combining a modern ASP.NET Core 10 backend with a responsive React 19 frontend. Its emphasis on real-time inventory tracking, streamlined put-away workflows, and barcode-assisted operations addresses core warehouse challenges while maintaining developer productivity through clean architecture, strong typing, and reusable patterns. The system is ready for extension to integrate with real backend services and production databases, supporting growth from small distribution centers to enterprise-scale logistics networks.