# Tarefas — Auth, Setup do Primeiro Usuário e Gestão de Usuários Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Tarefas login/setup flow, a placeholder dashboard, and a user-management screen, wired to the `projetozuper` Supabase project.

**Architecture:** Vite + React + TS SPA talks to Supabase directly (publishable key) for login, first-user setup, and reading profiles. A Supabase Edge Function (`admin-users`), running server-side with the secret key, handles privileged admin operations (create/edit/deactivate other users) so the secret key never reaches the browser.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v4, react-router-dom v6, @supabase/supabase-js v2, Supabase Postgres + Auth + Edge Functions.

**Spec:** `docs/superpowers/specs/2026-08-22-auth-usuarios-design.md`

## Global Constraints

- Todo texto de UI e mensagens de erro em PT-BR.
- Senha mínima de 6 caracteres (setup e criação de usuário).
- Sem suíte de testes automatizada nesta entrega — cada task é verificada manualmente/via automação de navegador (Chrome MCP), não com `pytest`/`vitest`.
- A secret key do Supabase nunca vai para o frontend nem é commitada no repositório — só existe como env var da Edge Function (auto-injetada pelo runtime do Supabase).
- RLS em `profiles`: `SELECT` liberado para `authenticated`; `INSERT`/`UPDATE`/`DELETE` bloqueados para o client (só a Edge Function, via service role, altera).
- "Desativar" usuário = `ban_duration` longo via Admin API — nunca exclusão de dados.
- Projeto Supabase: `projetozuper`, ref `ngppuvyeejjyoxhfjpym`, URL `https://ngppuvyeejjyoxhfjpym.supabase.co`.
- Migrações e deploy da Edge Function são aplicados via UI do dashboard Supabase (SQL Editor / "Via Editor" em Edge Functions) usando os tabs de automação de navegador (Chrome MCP) — não há CLI autenticado nesta máquina.

---

## Task 1: Project scaffolding + Supabase client

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `.gitignore`
- Create: `.env.local`
- Create: `.env.local.example`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/vite-env.d.ts`
- Create: `src/lib/supabaseClient.ts`

**Interfaces:**
- Produces: `supabase` — named export from `src/lib/supabaseClient.ts`, typed `SupabaseClient` (from `@supabase/supabase-js`). Reads `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "tarefas",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.2"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 3: Create `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tarefas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `.gitignore`**

```
node_modules
dist
.env.local
.env*.local
```

- [ ] **Step 7: Create `.env.local`**

```
VITE_SUPABASE_URL=https://ngppuvyeejjyoxhfjpym.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_QLvobTG4ENiVXBY1iT_hHA_9SSQoGT6
```

- [ ] **Step 8: Create `.env.local.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 9: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 10: Create `src/lib/supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 11: Create `src/index.css`**

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

- [ ] **Step 12: Create `src/App.tsx`** (placeholder, replaced in Task 3)

```tsx
export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Tarefas</h1>
    </div>
  )
}
```

- [ ] **Step 13: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 14: Install dependencies and verify dev server**

Run (from `C:\Projetos\tarefas`): `npm install`
Expected: installs without errors.

Run: `npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173/`). Open it (Chrome MCP `navigate` + `get_page_text`) and confirm the page shows "Tarefas". Stop the dev server (it will be restarted in Task 8's final check; you can leave it running in the background for use in later tasks' browser verification, or stop with Ctrl+C between tasks — your choice).

- [ ] **Step 15: Commit**

```bash
git add package.json vite.config.ts index.html tsconfig.json tsconfig.node.json .gitignore .env.local.example src
git commit -m "chore: scaffold Vite + React + TS + Tailwind project with Supabase client"
```

Note: `.env.local` is intentionally NOT committed (it's gitignored).

---

## Task 2: Database migration — profiles, trigger, RPC, RLS

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: Postgres table `public.profiles(id uuid PK, name text, email text, role text, status text, created_at timestamptz, updated_at timestamptz)`; RPC `public.has_admin_user() returns boolean`; trigger `on_auth_user_created` on `auth.users`.

- [ ] **Step 1: Create `supabase/migrations/0001_init.sql`**

```sql
-- profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'admin' check (role in ('admin')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- trigger function: create profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC: has_admin_user — lets the login screen decide setup vs. login
-- without exposing the profiles table to anonymous users.
create or replace function public.has_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles);
$$;

grant execute on function public.has_admin_user() to anon, authenticated;
```

- [ ] **Step 2: Verify email confirmation is disabled**

Using Chrome MCP, `navigate` to `https://supabase.com/dashboard/project/ngppuvyeejjyoxhfjpym/auth/providers`. Under "User Signups", confirm the "Confirm email" toggle is OFF (grey, not green). If it is ON, click it and then click "Save changes". This has already been verified OFF as of 2026-08-22 — this step just guards against it having been changed since.

- [ ] **Step 3: Apply the migration via the Supabase SQL Editor**

Using the Chrome MCP tools:
1. `tabs_context_mcp` with `createIfEmpty: true`, then `navigate` to `https://supabase.com/dashboard/project/ngppuvyeejjyoxhfjpym/sql/new`.
2. Click into the SQL editor text area and type (or paste) the full contents of `supabase/migrations/0001_init.sql`.
3. Click the **Run** button (top right) or press Ctrl+Enter.
4. Take a screenshot / use `get_page_text` to confirm a success message (e.g. "Success. No rows returned") and no red error banner.

- [ ] **Step 4: Verify the migration**

In the same SQL editor, open a new query tab (`+`), run:

```sql
select public.has_admin_user();
```

Expected: returns `false` (no users created yet — confirms the table/RPC exist and the project has no profiles).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: add profiles table, signup trigger, and has_admin_user RPC"
```

---

## Task 3: AuthContext, ProtectedRoute, and routing shell

**Files:**
- Create: `src/types/profile.ts`
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/routes/ProtectedRoute.tsx`
- Create: `src/pages/LoginPage.tsx` (temporary placeholder, replaced in Task 4)
- Create: `src/pages/DashboardPage.tsx` (temporary placeholder, replaced in Task 5)
- Create: `src/pages/UsersPage.tsx` (temporary placeholder, replaced in Task 7)
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabaseClient.ts` (Task 1).
- Produces: `Profile` type (`src/types/profile.ts`); `AuthProvider` component and `useAuth()` hook returning `{ user: User | null, profile: Profile | null, loading: boolean, signOut: () => Promise<void> }` (`src/contexts/AuthContext.tsx`); `ProtectedRoute` component (`src/routes/ProtectedRoute.tsx`).

- [ ] **Step 1: Create `src/types/profile.ts`**

```ts
export type ProfileStatus = 'active' | 'disabled'
export type ProfileRole = 'admin'

export interface Profile {
  id: string
  name: string
  email: string
  role: ProfileRole
  status: ProfileStatus
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Create `src/contexts/AuthContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types/profile'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data as Profile | null))
  }, [session?.user?.id])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 3: Create `src/routes/ProtectedRoute.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <span className="text-slate-500 dark:text-slate-400">Carregando...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
```

- [ ] **Step 4: Create placeholder pages**

`src/pages/LoginPage.tsx`:

```tsx
export function LoginPage() {
  return <div className="p-6">Login placeholder</div>
}
```

`src/pages/DashboardPage.tsx`:

```tsx
export function DashboardPage() {
  return <div className="p-6">Dashboard placeholder</div>
}
```

`src/pages/UsersPage.tsx`:

```tsx
export function UsersPage() {
  return <div className="p-6">Usuários placeholder</div>
}
```

- [ ] **Step 5: Rewrite `src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 6: Install react-router-dom types check and verify build**

Run: `npm run build`
Expected: TypeScript compiles with no errors, Vite build succeeds.

- [ ] **Step 7: Verify routing manually**

Run: `npm run dev`. Using Chrome MCP, `navigate` to `http://localhost:5173/` (or the printed port) and confirm it redirects to `/login` and shows "Login placeholder". Then `navigate` to `http://localhost:5173/dashboard` directly and confirm it also redirects to `/login` (not authenticated).

- [ ] **Step 8: Commit**

```bash
git add src/types/profile.ts src/contexts/AuthContext.tsx src/routes/ProtectedRoute.tsx src/pages/LoginPage.tsx src/pages/DashboardPage.tsx src/pages/UsersPage.tsx src/App.tsx
git commit -m "feat: add auth context, protected routes, and routing shell"
```

---

## Task 4: Login / first-user setup page

**Files:**
- Create: `src/lib/authErrors.ts`
- Create: `src/hooks/useHasAdminUser.ts`
- Create: `src/components/auth/SetupForm.tsx`
- Create: `src/components/auth/LoginForm.tsx`
- Modify: `src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 1), `useAuth()` (Task 3).
- Produces: `useHasAdminUser()` hook returning `boolean | null` (`null` while loading); `translateAuthError(message: string): string`.

- [ ] **Step 1: Create `src/lib/authErrors.ts`**

```ts
export function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha inválidos.',
    'User already registered': 'Este e-mail já está cadastrado.',
    'Email not confirmed': 'E-mail não confirmado.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
  }
  return map[message] ?? 'Ocorreu um erro. Tente novamente.'
}
```

- [ ] **Step 2: Create `src/hooks/useHasAdminUser.ts`**

```ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useHasAdminUser() {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.rpc('has_admin_user').then(({ data, error }) => {
      if (error) {
        console.error('Erro ao verificar usuário administrador:', error)
        setHasAdmin(false)
        return
      }
      setHasAdmin(Boolean(data))
    })
  }, [])

  return hasAdmin
}
```

- [ ] **Step 3: Create `src/components/auth/SetupForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { translateAuthError } from '../../lib/authErrors'

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function SetupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    setSubmitting(false)

    if (signUpError) {
      setError(translateAuthError(signUpError.message))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className={labelClass}>Nome</label>
        <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>E-mail</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>Senha</label>
        <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="confirmPassword" className={labelClass}>Confirmar senha</label>
        <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {submitting ? 'Criando conta...' : 'Criar conta'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Create `src/components/auth/LoginForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { translateAuthError } from '../../lib/authErrors'

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    setSubmitting(false)
    if (signInError) {
      setError(translateAuthError(signInError.message))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelClass}>E-mail</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>Senha</label>
        <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Rewrite `src/pages/LoginPage.tsx`**

```tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHasAdminUser } from '../hooks/useHasAdminUser'
import { SetupForm } from '../components/auth/SetupForm'
import { LoginForm } from '../components/auth/LoginForm'

export function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const hasAdmin = useHasAdminUser()

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-white">Tarefas</h1>
        {hasAdmin === null && <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>}
        {hasAdmin === false && (
          <>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              Crie a primeira conta de administrador para começar.
            </p>
            <SetupForm />
          </>
        )}
        {hasAdmin === true && (
          <>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Entre com sua conta.</p>
            <LoginForm />
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: no TypeScript errors.

- [ ] **Step 7: End-to-end verify: create the first user**

With `npm run dev` running, using Chrome MCP:
1. `navigate` to `http://localhost:5173/login`.
2. Confirm the "Crie a primeira conta..." copy and the 4-field setup form render (DB has no profiles yet, from Task 2).
3. Fill Nome = "Admin Teste", E-mail = "admin@tarefas.local", Senha = "senha123", Confirmar senha = "senha123".
4. Submit and confirm the app redirects to `/dashboard` (shows "Dashboard placeholder").
5. Re-navigate to `http://localhost:5173/login` directly — confirm it now shows the **login** form (not setup), since a profile now exists.

- [ ] **Step 8: Commit**

```bash
git add src/lib/authErrors.ts src/hooks/useHasAdminUser.ts src/components/auth/SetupForm.tsx src/components/auth/LoginForm.tsx src/pages/LoginPage.tsx
git commit -m "feat: add first-user setup and login forms"
```

---

## Task 5: Dashboard page, AppLayout, and theme toggle

**Files:**
- Create: `src/components/layout/ThemeToggle.tsx`
- Create: `src/components/layout/AppLayout.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3).
- Produces: `AppLayout` component (`{ children: ReactNode }` prop) used by `DashboardPage` and, later, `UsersPage` (Task 7).

- [ ] **Step 1: Create `src/components/layout/ThemeToggle.tsx`**

```tsx
import { useEffect, useState } from 'react'

function getInitialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
      aria-label="Alternar tema"
    >
      {theme === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
    </button>
  )
}
```

- [ ] **Step 2: Create `src/components/layout/AppLayout.tsx`**

```tsx
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/usuarios', label: 'Usuários' },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="px-6 py-5 text-lg font-semibold text-slate-900 dark:text-white">Tarefas</div>
        <nav className="mt-2 flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-sm text-slate-500 dark:text-slate-400">{profile?.name ?? 'Carregando...'}</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `src/pages/DashboardPage.tsx`**

```tsx
import { AppLayout } from '../components/layout/AppLayout'

export function DashboardPage() {
  return (
    <AppLayout>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-600 dark:bg-slate-800">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Nenhum módulo ainda</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          O módulo de Tickets/Tarefas será adicionado em uma próxima etapa.
        </p>
      </div>
    </AppLayout>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build` — expect no TypeScript errors.

- [ ] **Step 5: End-to-end verify**

With `npm run dev` running and already logged in from Task 4 (or log in again via `/login`), using Chrome MCP:
1. `navigate` to `http://localhost:5173/dashboard`.
2. Confirm sidebar shows "Tarefas", "Dashboard", "Usuários"; topbar shows "Admin Teste" and a "Sair" button.
3. Click the theme toggle button; confirm (via screenshot or `read_page`) the page background switches to dark styling and `localStorage.theme` persists across a reload.
4. Click "Sair"; confirm redirect to `/login`.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ThemeToggle.tsx src/components/layout/AppLayout.tsx src/pages/DashboardPage.tsx
git commit -m "feat: add dashboard page, app layout, and theme toggle"
```

---

## Task 6: Edge Function `admin-users`

**Files:**
- Create: `supabase/functions/admin-users/index.ts`

**Interfaces:**
- Consumes: `public.profiles` table (Task 2).
- Produces: Deployed Edge Function `admin-users`, invoked by the client as `supabase.functions.invoke('admin-users', { body: { action, ...payload } })` with `action` in `'create' | 'update' | 'set-status'`. Responses: `{ user }` for create, `{ success: true }` for update/set-status, or `{ error: string }` with a non-2xx status.

- [ ] **Step 1: Create `supabase/functions/admin-users/index.ts`**

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Não autenticado.' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: callerData, error: callerError } = await adminClient.auth.getUser(token)
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Não autenticado.' }, 401)
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, status')
    .eq('id', callerData.user.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'active') {
    return jsonResponse({ error: 'Acesso negado.' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const action = body.action as string

  if (action === 'create') {
    const { name, email, password } = body as { name: string; email: string; password: string }
    if (!name || !email || !password) {
      return jsonResponse({ error: 'Nome, e-mail e senha são obrigatórios.' }, 400)
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (error) {
      const message = error.message.includes('already been registered')
        ? 'Este e-mail já está cadastrado.'
        : error.message
      return jsonResponse({ error: message }, 409)
    }

    return jsonResponse({ user: data.user })
  }

  if (action === 'update') {
    const { userId, name, email, password } = body as {
      userId: string
      name?: string
      email?: string
      password?: string
    }
    if (!userId) {
      return jsonResponse({ error: 'userId é obrigatório.' }, 400)
    }

    const authAttrs: Record<string, unknown> = {}
    if (email) authAttrs.email = email
    if (password) authAttrs.password = password
    if (name) authAttrs.user_metadata = { name }

    if (Object.keys(authAttrs).length > 0) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, authAttrs)
      if (authUpdateError) {
        return jsonResponse({ error: authUpdateError.message }, 400)
      }
    }

    const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name) profileUpdates.name = name
    if (email) profileUpdates.email = email
    await adminClient.from('profiles').update(profileUpdates).eq('id', userId)

    return jsonResponse({ success: true })
  }

  if (action === 'set-status') {
    const { userId, status } = body as { userId: string; status: 'active' | 'disabled' }
    if (!userId || (status !== 'active' && status !== 'disabled')) {
      return jsonResponse({ error: 'Parâmetros inválidos.' }, 400)
    }

    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: status === 'disabled' ? '876000h' : 'none',
    })
    if (banError) {
      return jsonResponse({ error: banError.message }, 400)
    }

    await adminClient
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId)

    return jsonResponse({ success: true })
  }

  return jsonResponse({ error: 'Ação desconhecida.' }, 400)
})
```

- [ ] **Step 2: Deploy via the Supabase dashboard "Via Editor" flow**

Using Chrome MCP:
1. `navigate` to `https://supabase.com/dashboard/project/ngppuvyeejjyoxhfjpym/functions`.
2. Click "Deploy a new function" → "Via Editor" → "Open Editor".
3. Name the function `admin-users`.
4. Replace the editor's boilerplate content with the full contents of `supabase/functions/admin-users/index.ts` above.
5. Click "Deploy".
6. Confirm (screenshot / `get_page_text`) the function shows status "Deployed" / "Active" in the functions list.

- [ ] **Step 3: Smoke-test unauthenticated access**

Run (from any shell): `curl -i -X POST https://ngppuvyeejjyoxhfjpym.supabase.co/functions/v1/admin-users -H "Content-Type: application/json" -d "{\"action\":\"create\"}"`
Expected: HTTP 401 with body `{"error":"Não autenticado."}` (no `Authorization` header was sent).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/admin-users/index.ts
git commit -m "feat: add admin-users edge function for privileged user management"
```

---

## Task 7: Users management page

**Files:**
- Create: `src/api/adminUsers.ts`
- Create: `src/components/ui/ConfirmDialog.tsx`
- Create: `src/components/users/UsersTable.tsx`
- Create: `src/components/users/UserFormModal.tsx`
- Modify: `src/pages/UsersPage.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 1), `AppLayout` (Task 5), `Profile` type (Task 3), deployed `admin-users` Edge Function (Task 6).
- Produces: `createUser`, `updateUser`, `setUserStatus` functions from `src/api/adminUsers.ts`.

- [ ] **Step 1: Create `src/api/adminUsers.ts`**

```ts
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface CreateUserInput {
  name: string
  email: string
  password: string
}

interface UpdateUserInput {
  userId: string
  name?: string
  email?: string
  password?: string
}

async function invoke(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null)
      throw new Error((body as { error?: string } | null)?.error ?? error.message)
    }
    throw new Error(error.message)
  }

  return data
}

export function createUser(input: CreateUserInput) {
  return invoke('create', input)
}

export function updateUser(input: UpdateUserInput) {
  return invoke('update', input)
}

export function setUserStatus(userId: string, status: 'active' | 'disabled') {
  return invoke('set-status', { userId, status })
}
```

- [ ] **Step 2: Create `src/components/ui/ConfirmDialog.tsx`**

```tsx
interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/users/UserFormModal.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import type { Profile } from '../../types/profile'

interface UserFormModalProps {
  open: boolean
  initialData: Profile | null
  onClose: () => void
  onSubmit: (values: { name: string; email: string; password: string }) => Promise<void>
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function UserFormModal({ open, initialData, onClose, onSubmit }: UserFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const isEdit = Boolean(initialData)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isEdit && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ name, email, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {isEdit ? 'Editar usuário' : 'Novo usuário'}
        </h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Nome</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{isEdit ? 'Nova senha (opcional)' : 'Senha'}</label>
            <input
              type="password"
              required={!isEdit}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/users/UsersTable.tsx`**

```tsx
import type { Profile } from '../../types/profile'

interface UsersTableProps {
  users: Profile[]
  onEdit: (user: Profile) => void
  onToggleStatus: (user: Profile) => void
}

export function UsersTable({ users, onEdit, onToggleStatus }: UsersTableProps) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <th className="py-2 font-medium">Nome</th>
          <th className="py-2 font-medium">E-mail</th>
          <th className="py-2 font-medium">Status</th>
          <th className="py-2 font-medium">Criado em</th>
          <th className="py-2 font-medium text-right">Ações</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-3 text-slate-900 dark:text-white">{user.name}</td>
            <td className="py-3 text-slate-600 dark:text-slate-300">{user.email}</td>
            <td className="py-3">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  user.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {user.status === 'active' ? 'Ativo' : 'Desativado'}
              </span>
            </td>
            <td className="py-3 text-slate-600 dark:text-slate-300">
              {new Date(user.created_at).toLocaleDateString('pt-BR')}
            </td>
            <td className="py-3 text-right">
              <button type="button" onClick={() => onEdit(user)} className="mr-3 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Editar
              </button>
              <button type="button" onClick={() => onToggleStatus(user)} className="text-sm font-medium text-red-600 hover:underline dark:text-red-400">
                {user.status === 'active' ? 'Desativar' : 'Reativar'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 5: Rewrite `src/pages/UsersPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { UsersTable } from '../components/users/UsersTable'
import { UserFormModal } from '../components/users/UserFormModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { supabase } from '../lib/supabaseClient'
import { createUser, updateUser, setUserStatus } from '../api/adminUsers'
import type { Profile } from '../types/profile'

export function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [modalUser, setModalUser] = useState<Profile | null | undefined>(undefined)
  const [statusTarget, setStatusTarget] = useState<Profile | null>(null)

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleSubmit(values: { name: string; email: string; password: string }) {
    if (modalUser) {
      await updateUser({
        userId: modalUser.id,
        name: values.name,
        email: values.email,
        password: values.password || undefined,
      })
    } else {
      await createUser(values)
    }
    setModalUser(undefined)
    await loadUsers()
  }

  async function handleConfirmStatus() {
    if (!statusTarget) return
    const nextStatus = statusTarget.status === 'active' ? 'disabled' : 'active'
    await setUserStatus(statusTarget.id, nextStatus)
    setStatusTarget(null)
    await loadUsers()
  }

  return (
    <AppLayout>
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Usuários</h2>
          <button
            type="button"
            onClick={() => setModalUser(null)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Novo usuário
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
        ) : (
          <UsersTable users={users} onEdit={setModalUser} onToggleStatus={setStatusTarget} />
        )}
      </div>

      <UserFormModal
        open={modalUser !== undefined}
        initialData={modalUser ?? null}
        onClose={() => setModalUser(undefined)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.status === 'active' ? 'Desativar usuário' : 'Reativar usuário'}
        description={
          statusTarget?.status === 'active'
            ? `Tem certeza que deseja desativar ${statusTarget?.name}? A pessoa não conseguirá mais entrar no sistema.`
            : `Tem certeza que deseja reativar ${statusTarget?.name}?`
        }
        confirmLabel={statusTarget?.status === 'active' ? 'Desativar' : 'Reativar'}
        onConfirm={handleConfirmStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </AppLayout>
  )
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build` — expect no TypeScript errors.

- [ ] **Step 7: End-to-end verify (full CRUD cycle)**

With `npm run dev` running, using Chrome MCP, logged in as the first admin (`admin@tarefas.local` / `senha123` from Task 4):
1. `navigate` to `http://localhost:5173/usuarios`. Confirm the table shows one row ("Admin Teste").
2. Click "Novo usuário", fill Nome = "Segundo Admin", E-mail = "segundo@tarefas.local", Senha = "senha123", submit. Confirm the table now shows 2 rows and no error is shown.
3. Click "Editar" on the second row, change Nome to "Segundo Admin Editado", submit. Confirm the table reflects the new name.
4. Click "Desativar" on the second row, confirm in the dialog. Confirm the row's status badge changes to "Desativado".
5. Open a new tab, log out (or use an incognito-equivalent fresh tab), and attempt to log in as `segundo@tarefas.local` / `senha123` on `/login`. Confirm login fails with an error message (the account is banned).
6. Back as the first admin, click "Reativar" on the second row and confirm the status returns to "Ativo". Confirm `segundo@tarefas.local` can log in again.

- [ ] **Step 8: Commit**

```bash
git add src/api/adminUsers.ts src/components/ui/ConfirmDialog.tsx src/components/users/UsersTable.tsx src/components/users/UserFormModal.tsx src/pages/UsersPage.tsx
git commit -m "feat: add user management page with create, edit, and deactivate"
```

---

## Task 8: Final verification and local run

**Files:** none (verification only).

- [ ] **Step 1: Full rebuild from scratch**

Run: `rm -rf node_modules dist` then `npm install` then `npm run build`
Expected: clean install and build succeed with no errors.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev` (leave running).
Expected: Vite prints a local URL, e.g. `http://localhost:5173/`. Note the exact port (Vite picks the next free port if 5173 is busy).

- [ ] **Step 3: Full manual regression pass**

Using Chrome MCP against the printed URL:
1. Fresh login/logout cycle for the first admin.
2. Dashboard loads with sidebar/topbar and theme toggle.
3. Users page: table lists all created users; create/edit/deactivate/reactivate still work.
4. Check `read_console_messages` for any uncaught JS errors on each page — expect none.

- [ ] **Step 4: Report the URL**

Tell the user the exact localhost URL the dev server printed (e.g. `http://localhost:5173/`) so they can open it themselves.
