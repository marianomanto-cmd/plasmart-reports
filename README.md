# Plasmart Reports

Dashboard interno de campañas digitales para Plasmart (Transfil).
Consolida data de Google Ads, Meta Ads y Google Analytics 4 con análisis
automatizado por Claude AI.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Estilos:** Tailwind CSS + Tremor
- **Backend:** Supabase (Postgres + Auth + Edge Functions)
- **Hosting:** Vercel
- **IA:** Claude API (Anthropic)

## Estructura
```

app/ # Next.js App Router (páginas y layouts) components/ # Componentes React reutilizables lib/ # Utilidades, clientes (Supabase, Anthropic) supabase/ ├── migrations/ # Migrations versionadas de Postgres └── functions/ # Edge Functions (ingesta, análisis) public/ # Assets estáticos

```

## Setup local

```bash
# Instalar dependencias
npm install

# Variables de entorno (copiar y completar)
cp .env.local.example .env.local

# Correr en local
npm run dev
```

App disponible en http://localhost:3000

## Variables de entorno

Ver `.env.local.example` para la lista completa. Las críticas son:

- `NEXT_PUBLIC_SUPABASE_URL` — pública, URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — pública, anon key de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — **SECRETA**, solo server-side
- `ANTHROPIC_API_KEY` — **SECRETA**, solo server-side

## Convenciones

- Lenguaje del código: inglés (variables, funciones, tipos)
- Lenguaje del producto (UI, copy, comentarios): español rioplatense
- Lenguaje de commits: español, conciso, en imperativo ("agrego x", "fix y")

## Documentación adicional

- `CLAUDE.md` — contexto completo del proyecto para Claude Code
- `plasmart-reporteria-doc-tecnico.md` — documento técnico con plan por fases (vive en otra ubicación, fuera del repo)
