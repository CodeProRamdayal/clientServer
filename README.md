# Salary Management Client

Responsive React + TypeScript frontend using Vite, Redux Toolkit, React Router, and browser Local Storage.

## Run locally

```powershell
npm install
npm run dev
```

By default the app runs in local demo mode. Sign in with `admin@example.com` / `admin123` or `user@example.com` / `user123`. Employee and auth state are persisted in Local Storage and remain available after refresh.

## Connect to the backend API

1. Start the backend on port `4000` and configure its database and seed accounts as described in `../backendServer/README.md`.
2. Copy `.env.example` to `.env` (or set the variable in the environment):

   ```text
   VITE_API_BASE_URL=/api/v1
   ```

3. Restart the Vite dev server. The development proxy forwards `/api` requests to `http://localhost:4000`; sign in with the backend seed administrator or HR credentials.

The client uses the backend login/logout, role, employee CRUD, and salary APIs. Authentication tokens and employee records are cached in Local Storage. Department, designation, joining date, status, and employee ID are client-side fields because the current API schema does not expose them. In a production deployment, route `/api` to the backend with your web server, or set `VITE_API_BASE_URL` to the API's public base URL and configure backend CORS accordingly.

## Validate

```powershell
npm run build
npm run lint
```
