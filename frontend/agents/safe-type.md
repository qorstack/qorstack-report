# Safe Type

Do not use unsafe types in the code. Use safe types instead.

## Rules

- Do not use `any` type. Use `unknown`, proper interfaces, or generics instead.
- **Exception:** `any` is allowed in `try/catch` error handlers (e.g., `catch (error: any)`).
- Use generic types (`<T>`) in function signatures for reusable, type-safe code.
- Prefer explicit return types on exported functions.
- Avoid type assertions (`as`) unless absolutely necessary — prefer type narrowing with guards.
