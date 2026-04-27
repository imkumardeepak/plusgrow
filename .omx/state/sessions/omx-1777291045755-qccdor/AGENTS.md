# AGENTS.md - PlusGrow WMS Development Guide

## Build / Lint / Test Commands

### Frontend (React 19 + TypeScript + Vite)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | TypeScript type check (`tsc --noEmit`) |
| `npm run clean` | Remove dist folder |

### Backend (ASP.NET Core 10)

| Command | Description |
|---------|-------------|
| `dotnet build` | Build the API project |
| `dotnet run` | Run API server on port 5179 |
| `dotnet build --no-restore` | Build without restoring packages |
| `dotnet run --launch-profile Development` | Run in Development mode |

Note: No test framework is currently configured. To add tests, create an xUnit project with `dotnet new xunit`.

---

## Code Style Guidelines

### Frontend (React/TypeScript)

#### File Naming
- Components: `PascalCase` (e.g., `Dashboard.tsx`, `ProductCard.tsx`)
- Utilities/hooks: `camelCase` (e.g., `useAuth.ts`, `utils.ts`)
- Constants: `camelCase` or `UPPER_SNAKE_CASE`

#### Component Structure (Atomic Design)
```
src/components/
├── atoms/       # Basic UI (Button, Input, Badge, Card, Modal)
├── molecules/    # Composite components
├── organisms/   # Complex components
├── templates/   # Page layouts
└── ui/          # Radix UI primitives
```

#### Imports Order
1. React imports
2. External libraries (react-router, tanstack-query, etc.)
3. Internal components/hooks
4. Utils/lib
5. Types
6. Assets

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/atoms/Button';
import { useAuth } from '@/context/AuthContext';
import { manufacturersApi } from '@/services/masterApi';
import { cn } from '@/lib/utils';
import type { Manufacturer } from '@/types/api';
```

#### TypeScript Conventions
- Use explicit types for props and function returns
- Use interfaces for object shapes, types for unions/aliases
- Snake_case for API response fields (matching backend), camelCase for internal use
- Use `null` instead of `undefined` for nullable API fields

#### State Management
- Server state: TanStack Query (`useQuery`, `useMutation`)
- Client state: React `useState` / `useReducer`
- Global state: React Context (`AuthContext`, `WmsContext`)

#### Form Handling
- Use `react-hook-form` with `zod` resolver for validation
- Show errors inline below inputs
- Use Sonner (`toast.success()`, `toast.error()`) for notifications

#### UI Components
- Use Tailwind CSS with `@tailwindcss/vite`
- Use `clsx` and `tailwind-merge` for conditional classes
- Use Radix UI primitives for accessible components

---

### Backend (ASP.NET Core / C#)

#### Project Structure
```
Backend/PlusgrowWms.Api/
├── Controllers/      # API endpoints
├── DTOs/            # Data Transfer Objects
├── Models/          # Entity models
├── Data/            # DbContext
├── Services/        # Business logic
├── Repositories/    # Data access
├── Validators/      # FluentValidation
├── Mappings/        # AutoMapper profiles
├── Helpers/         # Utility classes
└── Configuration/   # App configuration
```

#### Naming Conventions
- Controllers: `PascalCase` + `Controller` suffix (e.g., `ProductsController`)
- DTOs: `PascalCase` + `Dto` suffix (e.g., `CreateProductDto`)
- Models: `PascalCase` (e.g., `Product`)
- Interfaces: `I` prefix (e.g., `IAuthService`)

#### API Response Pattern
Use the base controller helper methods:
```csharp
// Success responses
return Success(result, "Message");
return Ok(entity);

// Error responses
return Error<T>("Error message");
return BadRequest<T>("Validation error");
return NotFound<T>("Not found");
```

#### Validation
- Use FluentValidation for DTO validation
- Register validators in `Program.cs`
- Add validation to DTOs with data annotations

#### Logging
- Use Serilog configured in `Program.cs`
- Use `ILogger<T>` in controllers/services
- Follow template: `LogInformation("User {Username} logged in", username)`

---

### Database

- PostgreSQL with Entity Framework Core
- Use Dapper for raw queries when needed
- Database schema defined in `Backend/setup.sql`
- Use migrations for schema changes

---

### General Guidelines

1. **Error Handling**: Always wrap async operations in try-catch, return appropriate HTTP status codes
2. **Security**: Never expose secrets in code, use environment variables
3. **Performance**: Lazy load routes in React, use query optimization in EF Core
4. **Accessibility**: Use semantic HTML, proper ARIA labels
5. **Testing**: Write unit tests for services, integration tests for API endpoints

---

### Running Both Projects

1. **Start Backend**: `dotnet run` in `Backend/PlusgrowWms.Api/`
2. **Start Frontend**: `npm run dev` in `Frontend/`
3. **API runs on**: `http://localhost:5179`
4. **Frontend runs on**: `http://localhost:3000`

---

### Environment Variables

**Frontend** (`.env`):
```
VITE_API_URL=http://localhost:5179/api
VITE_APP_URL=http://localhost:3000
```

**Backend** (`appsettings.Development.json`):
- Configure connection string for PostgreSQL
- Configure JWT settings (Key, Issuer, Audience)

<!-- OMX:RUNTIME:START -->
<session_context>
**Session:** omx-1777291045755-qccdor | 2026-04-27T11:57:27.880Z

**Codebase Map:**
  Frontend/: generateProductTemplate, App, Badge, Button, Card, Input
  .vite/: @tanstack_react-query, canvas-confetti, chunk-KDVGFZWC, chunk-W3YVNZCF, chunk-WOOG5QLI, chunk-XKJYF32X, class-variance-authority, clsx, jsbarcode, lucide-react

**Explore Command Preference:** enabled via `USE_OMX_EXPLORE_CMD` (default-on; opt out with `0`, `false`, `no`, or `off`)
- Advisory steering only: agents SHOULD treat `omx explore` as the default first stop for direct inspection and SHOULD reserve `omx sparkshell` for qualifying read-only shell-native tasks.
- For simple file/symbol lookups, use `omx explore` FIRST before attempting full code analysis.
- When the user asks for a simple read-only exploration task (file/symbol/pattern/relationship lookup), strongly prefer `omx explore` as the default surface.
- Explore examples: `omx explore...

**Compaction Protocol:**
Before context compaction, preserve critical state:
1. Write progress checkpoint via state_write MCP tool
2. Save key decisions to notepad via notepad_write_working
3. If context is >80% full, proactively checkpoint state
</session_context>
<!-- OMX:RUNTIME:END -->
