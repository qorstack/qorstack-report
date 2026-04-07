# API Integration & Error Handling Standards

When writing or reviewing API integrations, external service calls, or backend logic (like C# or Node.js), adhere to the following strict guidelines:

1. **Never Trust Input/Output:** Always validate incoming payloads and external API responses.
2. **Graceful Degradation:** If an external service fails, the app must not crash. Implement proper `try/catch` blocks.
3. **Comprehensive Logging:** Ensure errors are logged with sufficient context (correlation IDs, timestamps, failure points) to make debugging easy. Do not log sensitive user data.
4. **Timeouts & Retries:** External API calls must have explicit timeouts. Suggest retry mechanisms (like Polly in C#) for transient failures.

**Command:** When I type `/audit-api`, review the code specifically for security, error handling, and edge cases.
