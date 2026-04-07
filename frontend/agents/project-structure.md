# Project Structure

This is a **Next.js 16** (App Router) project with **TypeScript**, **Tailwind CSS**, and **Turbopack**.

## Key Directories

```
src/
├── app/              # Next.js App Router (file-based routing)
│   ├── (marketing)/  # Public pages (landing, pricing, docs)
│   ├── (dashboard)/  # Authenticated pages (projects, settings)
│   ├── api/          # API route handlers
│   ├── layout.tsx    # Root layout with providers and metadata
│   ├── providers.tsx # Client-side providers wrapper
│   ├── robots.ts     # Dynamic robots.txt
│   └── sitemap.ts    # Dynamic sitemap.xml
├── components/       # Reusable UI components
├── layouts/          # Shared layout components (sidebar, navbar, etc.)
├── providers/        # React context providers
├── api/              # API client and generated types
├── types/            # Shared TypeScript types
├── hooks/            # Custom React hooks
├── utils/            # Utility functions
├── store/            # Redux store
├── configs/          # i18n and other configs
└── styles/           # Global CSS styles
```

## Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Language**: TypeScript
- **React**: 19
- **Styling**: Tailwind CSS
- **UI Library**: HeroUI (formerly NextUI)
- **Icons**: Iconify via `@/components/icon`
- **Animation**: Framer Motion
- **Auth**: Custom AuthContext provider
- **State**: Redux Toolkit + React Query
- **Package Manager**: Yarn
- **Linting**: ESLint 9 (flat config) + Prettier
- **Git Hooks**: Husky + lint-staged (pre-push)
