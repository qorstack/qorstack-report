# Code Style

## General

- Use **TypeScript** for all code files.
- Use **single quotes** for strings.
- Use **arrow functions** by default.
- Prefer `const` over `let`. Never use `var`.
- Use **template literals** for string interpolation.

## React / Next.js

- Use **functional components** only (no class components).
- Use **Tailwind CSS** for styling — no inline `style` objects unless dynamic values are required.
- Keep components small and focused. Extract reusable logic into custom hooks.
- Use `next/router` for navigation, `next/image` for images.

## Naming

- **Components**: PascalCase (e.g., `UserProfile`)
- **Files**: kebab-case for pages, PascalCase for components (e.g., `UserProfile.tsx`)
- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase otherwise
- **Types/Interfaces**: PascalCase, prefix interfaces with `I` only when needed for clarity
