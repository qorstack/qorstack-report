# Project Rules

Read and follow **all** `.md` files in the `agents/` directory.

## Package Manager

- Always use **Yarn**. Never use npm.
- `yarn add` / `yarn remove` / `yarn dev` / `yarn build`
- Never generate `package-lock.json` — only `yarn.lock`

## TypeScript & Type Safety

- Do not use `any` type. Use `unknown`, interfaces, or generics.
- **Exception:** `any` is allowed in `catch (error: any)`.
- Use generic types `<T>` for reusable, type-safe code.
- Prefer explicit return types on exported functions.
- Avoid type assertions (`as`) — prefer type narrowing with guards.

## Code Style

- Use **TypeScript** for all files.
- Use **single quotes** for strings.
- Use **arrow functions** by default.
- Prefer `const` over `let`. Never use `var`.
- Use **template literals** for string interpolation.
- Remove commented-out code and unnecessary `console.log`.

## React / Next.js

- **Functional components** only (no class components).
- Use **Tailwind CSS** for styling — no inline `style` unless dynamic values.
- Keep components small. Extract reusable logic into custom hooks.
- Use `next/image` for images, `next/navigation` for routing.
- Avoid unnecessary re-renders (memoize where needed).

## Naming Conventions

- **Components**: PascalCase (`UserProfile`)
- **Files**: kebab-case for pages, PascalCase for components
- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Types/Interfaces**: PascalCase

## Project Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **React**: 19
- **Styling**: Tailwind CSS
- **UI Library**: HeroUI (formerly NextUI)
- **Icons**: Iconify via `@/components/icon`
- **Animation**: Framer Motion
- **Auth**: Custom AuthContext provider
- **State**: Redux Toolkit + React Query
- **Linting**: ESLint 9 (flat config) + Prettier
- **Git Hooks**: Husky + lint-staged (pre-push)

## Project Structure

```text
src/
├── app/              # Next.js App Router (file-based routing)
│   ├── (marketing)/  # Public pages (landing, pricing, docs)
│   ├── (dashboard)/  # Authenticated pages (projects, settings)
│   └── api/          # API route handlers
├── components/       # Reusable UI components
├── layouts/          # Shared layout components (sidebar, navbar)
├── providers/        # React context providers
├── api/              # API client and generated types
├── types/            # Shared TypeScript types
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── store/            # Redux store
└── styles/           # Global CSS styles
```

## API Integration

- Never trust input/output — always validate payloads and API responses.
- Graceful degradation — app must not crash on external service failure.
- Log errors with context (correlation IDs, timestamps). Never log sensitive data.
- External API calls must have explicit timeouts.

## Code Review Rules

- Identify code smells: duplication, nested loops, hardcoded values.
- Use **Early Return** pattern — refactor complex if/else blocks.
- Provide exact, complete rewritten code — not just explanations.

## Design Skills

- `/refactor-uxui` — One-shot redesign (audit → normalize → polish)
- `/code-review` — Strict code review with actionable fixes
- `/audit` — Quality audit (a11y, performance, responsive)
- `/critique` — Design critique (hierarchy, architecture, emotion)
- `/polish` — Final quality pass before shipping
- `/bolder` — Amplify safe designs for more visual impact
- `/normalize` — Align with design system standards

## Frontend Design Standards

- Follow `agents/frontend-design/design-all.md` for all UI work.
- Reference files in `agents/frontend-design/reference/` for typography, color, spacing, motion, interaction, responsive, and UX writing.
- Avoid AI slop: no cyan-on-dark, no purple gradients, no glassmorphism everywhere.
- Use OKLCH color spaces, fluid typography with `clamp()`, and fluid spacing.

# currentDate

Today's date is 2026-03-21.
