# Handoff — Corey Haines tab + marketing skills

> Doc temporal para retomar el trabajo desde otra máquina.
> Borrar este archivo cuando ya no haga falta.

## Estado actual (2026-05-10)

**Mergeado a `main`** ✅
- PR #2: https://github.com/marianomanto-cmd/plasmart-reports/pull/2
- Squash commit en main: `1619c0a` — "Tab Corey Haines + marketing skills + filtros persistentes (#2)"
- Branch `claude/add-marketing-skills-plugin-xes6A` sigue viva (commits originales `c27684c` y `da1eab8`).

**Vercel deploy** — falta verificar manualmente
- El check `Vercel Preview Comments` en el PR pasó OK.
- El deploy de producción (gatillado por el merge a main) no se pudo monitorear desde el entorno de Claude Code on Web (sin token de Vercel ni acceso a GitHub deployments API).
- **Acción pendiente:** abrir https://vercel.com/dashboard, confirmar que el último deploy de `main` está en `Ready`, y entrar a `/dashboard/corey-haines` con un usuario `@transfil.com.ar`.

---

## Qué se entregó

### 1. Marketing skills en el repo
- 41 skills de [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT) copiadas a `.claude/skills/`.
- Disponibles para Claude Code en CLI y web.
- `.gitignore` actualizado con excepción `!.claude/skills/` para trackear skills sin commitear config local de Claude Code.
- LICENSE preservado en `.claude/skills/LICENSE`.

### 2. Tab "Corey Haines" en el dashboard
Nueva ruta `/dashboard/corey-haines` que aplica 7 skills al período seleccionado y devuelve un reporte ejecutivo:

- **Skills aplicadas:** `paid-ads`, `ad-creative`, `analytics-tracking`, `ab-test-setup`, `marketing-ideas`, `customer-research`, `competitor-profiling`.
- **Formato del reporte:** diagnóstico ejecutivo, 4-7 recomendaciones priorizadas (con `Skill` / `Insight` / `Hipótesis` / `Acción` / `Cómo medirlo`), 2-3 tests A/B sugeridos, riesgos + data faltante.
- **Cache:** comparte tabla `ai_analysis_cache` con el análisis de Resumen, pero usa namespace `"corey"` en el hash para no chocar.
- **Prompt caching:** activado sobre el system block (skills + instrucciones). El segundo hit del mismo período paga ~10% del input.

### 3. Filtros persistentes entre tabs
- `components/dashboard-tabs.tsx` ahora arrastra `?from=&to=&publisher=&type=&campaign=&compare=` al cambiar de pestaña.
- Probar: setear filtros en Resumen → ir a Comparativa → ver que el rango se mantiene.

---

## Archivos tocados

```
NUEVOS
├── .claude/skills/                        (41 skills + LICENSE)
├── app/api/corey-haines/route.ts          (endpoint del reporte)
├── app/dashboard/corey-haines/page.tsx    (server component)
├── components/corey-haines-analysis.tsx   (client component)
└── lib/ai/corey-prompt.ts                 (builder del prompt + skills)

MODIFICADOS
├── .gitignore                             (excepción para .claude/skills/)
├── components/dashboard-tabs.tsx          (preserva query params + tab nueva)
├── lib/ai/hash.ts                         (param namespace opcional)
└── next.config.ts                         (outputFileTracingIncludes)
```

---

## Para retomar desde otra máquina

```bash
git clone <repo-url> plasmart-reports
cd plasmart-reports
git checkout main
git pull
npm install
```

Variables de entorno en `.env.local` (mismas que ya estaban):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- (Opcional) `ANTHROPIC_MODEL` — default `claude-sonnet-4-6`
- (Opcional) `ANTHROPIC_COREY_MAX_TOKENS` — default `3500`

Para correr local:
```bash
npm run dev
```

Para verificar build:
```bash
npm run type-check
npm run build
```

---

## Test plan (lo que quedó por hacer)

- [ ] Confirmar deploy de prod en Vercel (último commit de `main` = `1619c0a`).
- [ ] Loguearse en `/dashboard` con cuenta `@transfil.com.ar`.
- [ ] Ir a Resumen, setear `from`/`to`, ir a Comparativa → verificar que el rango se mantiene.
- [ ] Repetir para Detalle y Corey Haines.
- [ ] En `/dashboard/corey-haines` clickear "Generar reporte" — esperar 30-60s.
- [ ] Validar que el output tiene las secciones esperadas (diagnóstico / recomendaciones con justificación / tests / riesgos).
- [ ] Volver a clickear → debe aparecer "Desde cache" instantáneamente.
- [ ] Clickear "Regenerar reporte" → debe llamar a Claude de nuevo (input cacheado, output nuevo).

### Posibles problemas

| Síntoma | Diagnóstico | Fix |
|---|---|---|
| API responde "ANTHROPIC_API_KEY no configurada" | Falta env var en Vercel | Agregar en Vercel → Settings → Environment Variables, redeploy |
| Reporte genera pero dice "ENOENT no such file SKILL.md" | `outputFileTracingIncludes` no aplicó | Verificar `next.config.ts:7` y rebuildear |
| Tarda más de 90s | `MAX_TOKENS` muy alto o el modelo elegido es lento | Bajar `ANTHROPIC_COREY_MAX_TOKENS` a 2500 o cambiar modelo |
| El prompt es muy grande (>40k tokens input) | Demasiadas skills cargadas | Editar `ACTIVE_SKILLS` en `lib/ai/corey-prompt.ts:18` |

---

## Próximos pasos lógicos (cuando vuelvas)

Ideas para iterar, en orden de impacto estimado:

1. **Botón "Descargar PDF"** en el reporte de Corey (replicar el de `components/ai-analysis.tsx:186`).
2. **Selector de skills activas** en la UI — checkboxes para que el usuario elija qué frameworks aplicar a este reporte específico.
3. **Comparar dos períodos** lado a lado en Corey Haines (ej: "última semana vs. semana anterior" con dos análisis paralelos).
4. **Entrenar un skill propio de Plasmart** en `.claude/skills/plasmart-industrial/SKILL.md` con conocimiento específico del rubro (corte láser/plasma, CNC, audiencias B2B argentinas, etc.).
5. **Mover otras tablas a este modelo** — ej: que la tab `Detalle` también use el motor con skills para explicar anomalías por campaña.

---

## Convenciones que respetar

(Recordatorio rápido del CLAUDE.md del proyecto)

- Variables/funciones/archivos en **inglés**.
- UI/copy/comentarios en **español rioplatense**.
- Commits en **español, imperativo, conciso**.
- TypeScript strict siempre.
- Server Components por default; Client Components solo si hay interactividad.
- Anthropic API key NUNCA en el cliente.
- Toda tabla con RLS habilitado, política `@transfil.com.ar`.
