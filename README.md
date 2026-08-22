# Cybeat Web Frontend

Enterprise-grade Vue 3 + TypeScript SPA using **feature-based / vertical slice architecture**.

---

## Installation

```bash
npm install
```

---

## Environment

Copy `.env.example` to `.env` and configure your values:

```bash
cp .env.example .env
```

`.env.example`:

```env
VITE_API_BASE_URL=https://cybeat.sibeux.my.id/api
```

`VITE_*` variables are injected into the client bundle at build time.  
They are **not secrets** — do not put passwords, tokens, or private keys here.  
Never commit `.env` — it is listed in `.gitignore`.

---

## Development

```bash
npm run dev
```

Starts the Vite dev server (default: `http://localhost:5173`).

---

## Linting

```bash
npm run lint
```

---

## Production Build

```bash
npm run build
```

Outputs to `dist/`. The `dist/.htaccess` file is automatically included from `public/.htaccess`.

---

## Deployment (Shared Hosting)

1. Run `npm run build`
2. Upload the **contents** of `dist/` to your hosting's public directory (e.g. `public_html/`)
3. Ensure Apache `mod_rewrite` is enabled on your hosting

The included `.htaccess` handles SPA routing so `/login`, `/register`, and `/` all work when accessed directly or on page refresh.

> **Node.js is NOT required** after deployment. The output is purely static HTML/CSS/JS.

---

## Architecture

This project uses **Feature-Based / Vertical Slice Architecture**.

```
src/
├── app/              # Application shell — router, layouts, config
├── features/         # Business features (vertical slices)
│   ├── auth/         # Authentication: login, register, logout, session
│   └── dashboard/    # Dashboard placeholder (expand here)
├── infrastructure/   # Cross-cutting technical concerns
│   ├── http/         # Axios client + interceptors
│   └── storage/      # Auth token storage abstraction
├── shared/           # Genuinely reusable primitives
│   ├── components/   # BaseButton, BaseInput, LoadingSpinner
│   ├── composables/  # useDebounce
│   ├── types/        # Shared API types
│   └── utils/        # error-normalizer
├── App.vue           # Root — session-expired coordinator
└── main.ts           # Startup sequence
```

### Why vertical slices?

A global technical-layer structure (`components/`, `services/`, `stores/`, `api/`) mixes all features together.  
When you work on **Projects**, you shouldn't need to grep through global folders to find auth logic.

Each feature owns its slice end-to-end:

```
features/auth/
├── api/         ← HTTP calls
├── components/  ← UI components
├── pages/       ← Route views
├── stores/      ← Pinia state
├── types/       ← TypeScript types
├── utils/       ← Feature-local utilities (jwt decoder)
└── validation/  ← Form validation (pure functions)
```

### Dependency direction

```
app → features → infrastructure / shared
```

Features must not depend on other features.  
Infrastructure must not depend on features.

### Adding a new feature

```bash
mkdir -p src/features/projects/{api,components,pages,stores,types}
```

Add routes in `src/app/router/index.ts`.  
Everything else lives inside `features/projects/`.

---

## Authentication Flow

```
User fills login form
        ↓
LoginForm.vue calls authStore.login()
        ↓
auth.store.ts calls authApi.login()
        ↓
auth.api.ts: POST /auth/login (JSON)
        ↓
Axios client (infrastructure/http/axios.ts)
        ↓
Backend API
        ↓
AuthResponse { access_token, refresh_token }
        ↓
auth.store.ts: applySession()
  → saves tokens to authStorage
  → decodes JWT for display (name, email)
  → isAuthenticated becomes true (derived)
        ↓
router.push('/')
        ↓
Navigation guard: isAuthenticated → allow
```

### Session Expiration (401)

```
Any API request → 401
        ↓
Axios response interceptor (interceptors.ts)
  → clears storage (authStorage.clearAll)
  → dispatches DOM event: cybeat:session-expired
        ↓
App.vue listener
  → authStore.clearSession()
  → router.push('/login')
```

### Startup (session restore)

```
createApp → pinia → router → interceptors
        ↓
authStore.restoreSession()
  → reads tokens from localStorage
  → populates state (isInitializing = false)
        ↓
app.mount()
        ↓
Router initial navigation
  → guard: isInitializing is false → proceed
```

---

## Security Notes

- Tokens are stored in `localStorage` via `infrastructure/storage/auth-storage.ts`
- Never log tokens or passwords anywhere
- JWT is decoded only for display metadata (name in nav bar) — not for authorization
- Backend authorization is always authoritative
- Token refresh is architecturally prepared but not implemented (endpoint not yet specified)
