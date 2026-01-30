# Copilot Instructions for ProfRankSystem

## Project Overview

**ProfRankSystem** is a React + Vite frontend with Express.js backend for managing professor rankings and departments. Two-role authentication system: `principal` (SUPER_ADMIN) and `hod` (DEPT_ADMIN).

## Architecture

### Frontend (React + Vite + Tailwind)
- **Entry**: [src/main.jsx](src/main.jsx) → [src/App.jsx](src/App.jsx)
- **Auth Layer**: [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx) provides `useAuth()` hook, stores tokens/role/dept in localStorage
- **Route Protection**: [src/components/PrivateRoute.jsx](src/components/PrivateRoute.jsx) wraps role-specific routes, redirects unauthorized access
- **Role Translation**: DB returns `SUPER_ADMIN`/`DEPT_ADMIN`, frontend normalizes to `principal`/`hod` (see [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx#L37-L39))
- **Styling**: Tailwind CSS (configured in [tailwind.config.js](tailwind.config.js)), no custom CSS library

### Backend (Express.js + MySQL)
- **Entry**: [backend/server.js](backend/server.js) on port 5000
- **Auth**: JWT tokens signed with `JWT_SECRET`, expires in 2 hours. Password hashing via bcrypt
- **DB Connection**: MySQL via mysql2 driver, credentials from `.env`
- **CORS**: Enabled globally for all origins

### Data Flow
1. Login form → POST `/api/login` with email/password
2. Backend queries user, verifies bcrypt hash, returns JWT + role/dept
3. Frontend stores token/role/dept in localStorage via AuthContext
4. Subsequent requests include JWT in Authorization header
5. PrivateRoute validates user exists & role matches `allowedRoles` array

## Critical Files & Patterns

| File | Purpose |
|------|---------|
| [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx) | Auth state, login/logout, token management—wraps entire app |
| [src/components/PrivateRoute.jsx](src/components/PrivateRoute.jsx) | Route guard with role-based access, handles loading state |
| [src/pages/PrincipalDashboard.jsx](src/pages/PrincipalDashboard.jsx) | Tab-based UI pattern for principal-only features |
| [src/pages/HODDashboard.jsx](src/pages/HODDashboard.jsx) | Similar structure for HOD (department-level) functions |
| [backend/server.js](backend/server.js) | All endpoints; login authentication + role assignment |
| [backend/sqlscript.sql](backend/sqlscript.sql) | DB schema: users, depts, subjects, rankings |

## Developer Workflows

### Frontend Development
```bash
cd . && npm run dev          # Start Vite dev server (port 5173)
npm run build                # Production build
npm run lint                 # ESLint check
```

### Backend Development
```bash
cd backend && npm run dev    # Start with nodemon (watches server.js)
npm run start                # Production run
```

### Environment Setup
Backend requires `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=profrank_db
JWT_SECRET=your_secret_key
```

## Project Conventions

- **Component Organization**: Managers (DepartmentManager, TeacherManager) handle data + UI logic; ui/SharedComponents for reusable elements
- **Tab Navigation**: Dashboard pages use `activeTab` state + switch pattern (see [src/pages/PrincipalDashboard.jsx](src/pages/PrincipalDashboard.jsx#L8-L13))
- **Error Handling**: Frontend catches login errors as strings; backend returns JSON with `message` field
- **API Calls**: Use `fetch()` not axios (though axios is in dependencies); credentials passed in JSON body
- **Role Names**: Database stores `SUPER_ADMIN`/`DEPT_ADMIN`, frontend converts to `principal`/`hod` for routing
- **State Management**: React Context for auth only; component-level useState for UI state (tabs, forms)

## Common Tasks & Implementation Patterns

### Adding a New Dashboard Feature
1. Create component in `src/components/` (e.g., NewFeature.jsx)
2. Import in dashboard ([src/pages/PrincipalDashboard.jsx](src/pages/PrincipalDashboard.jsx) or HODDashboard.jsx)
3. Add tab button + case in renderContent() switch
4. Protect with existing `useAuth()` if needed

### Adding a New API Endpoint
1. Define handler in [backend/server.js](backend/server.js)
2. Extract token validation logic (auth header check) if needed
3. Query DB via `db.query(sql, params, callback)`
4. Return JSON with consistent `{ message, data }` structure

### Database Schema Changes
- Refer to [backend/sqlscript.sql](backend/sqlscript.sql) for existing tables (users, depts, subjects)
- Update schema file and re-run to test locally

## Integration Points & Dependencies

- **React Router v6**: Used for SPA routing; see Route + Navigate patterns in [src/App.jsx](src/App.jsx)
- **JWT Decode**: Imported but not actively used in current code; available for token inspection if needed
- **QRCode.react**: Imported; used in QRGenerator component for QR code generation
- **Tailwind + PostCSS**: Build pipeline configured; `npm run build` compiles CSS

## Debugging Tips

- **Auth Issues**: Check localStorage keys (token, role, dept) in DevTools
- **API Failures**: Verify backend is running on port 5000; check `.env` DB credentials
- **Role Mismatch**: Confirm role translation in AuthContext (line 37-39)
- **CORS Errors**: Backend has `cors()` globally enabled; if still failing, check API URL in fetch calls

