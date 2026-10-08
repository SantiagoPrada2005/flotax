# Rule: Client Time Context & Date Handling in Cloudflare Workers

## Mandatory Timezone & Date Standard

- **Never use naive UTC dates for circadian or calendar records**:
  - Cloudflare Workers and SSR runtimes execute in **UTC**.
  - Using `new Date().toISOString().slice(0, 10)` in server endpoints creates an evening timezone mismatch (e.g. for users in UTC-5, after 7:00 PM local time, UTC is already the next day).
  - This causes records (tasks, night plans, journals, tunnel sessions) to be persisted with tomorrow's date, disappearing from today's client queries and dashboards.

- **Always resolve dates via `resolveClientTimeContext`**:
  - Import `resolveClientTimeContext` from `src/lib/time/client-time.js` in all API routes (`APIRoute`) and SSR Astro pages (`.astro`).
  - Derive the default date string using `timeCtx.dateString`:
    ```ts
    const timeCtx = resolveClientTimeContext(context.request);
    const date = body.date ?? timeCtx.dateString;
    ```
  - `resolveClientTimeContext` reads Cloudflare request context (`cf.timezone`), client headers (`x-timezone`), and cookies (`movix_tz`), with fallback to `America/Bogota`.

- **Explicit Date Propagation in UI Clients**:
  - Interactive UI components (e.g., `<TasksMatrixBoard />`) MUST receive the resolved local date as a prop from the SSR page (e.g., `currentDate={today}`) and embed it into the container's data attributes (`data-current-date={currentDate}`).
  - Client-side fetch requests (`POST`, `PATCH`) must send `date: boardDate` explicitly in their payloads.

- **Dynamic DOM vs. Scoped Styles**:
  - Astro `<style>` tags are scoped by default with `data-astro-cid-*` attributes. Elements created dynamically in client JS (`document.createElement`) will not match scoped styles unless `<style is:global>` (prefixed with component root class) is used, or a `<template>` element is cloned, or the page triggers synchronization.
