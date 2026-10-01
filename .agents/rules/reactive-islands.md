# Rule: React Islands & Reactive State Governance (Anti-Imperative DOM Standard)

## 1. Context & Purpose

In Phoenix, server-side rendering, routing, middleware, and database access are owned by **Astro** (`@astrojs/cloudflare`). However, complex client-side interactivity—such as AI streaming, countdown timers, audio recording, and dynamic optimistic forms—must NEVER be implemented using imperative DOM scripts.

This rule forbids manual DOM manipulation and establishes **React Islands (`.tsx`)** as the standard for stateful client experiences.

---

## 2. Absolute Prohibitions for AI Agents

1. **NO Imperative DOM Creation/Mutation**:
   - Strictly forbidden: `document.createElement()`, `el.appendChild()`, `el.innerHTML = ...`, `el.classList.add()` for driving component state or streaming.
   - Forbidden: writing vanilla TypeScript controller classes/modules that manipulate the DOM imperatively (e.g., `chat-client.ts` constructing message bubbles).
2. **NO Unmanaged Global Event Listeners in Pages**:
   - Forbidden: attaching `addEventListener` directly to `window`, `document`, or DOM nodes inside `<script>` tags without explicit lifecycle cleanup/teardown.
   - Forbidden: storing application state in DOM `dataset` attributes (`data-session-id`, `data-task-id`) as a substitute for reactive state.
3. **NO Reinventing State Machines in Vanilla JS**:
   - Complex state transitions (idle, loading, streaming, paused, error) must be declared with React hooks (`useState`, `useReducer`, or custom hooks), never with loose mutable variables in script scopes.

---

## 3. Decision Matrix: When to Use Astro vs. React

| Scenario | Technology | Directives |
| :--- | :--- | :--- |
| Macro layout, AppShell, Nav | **Astro (`.astro`)** | Static or CSS-only interactivity, zero JS bundle cost. |
| Page Data Fetching (SSR) | **Astro Frontmatter (`---`)** | Load data from Cloudflare D1 / Drizzle, pass typed props. |
| Read-only Cards & Badges | **Astro (`.astro`)** | Presentational, Tier 1/2 atomic components. |
| **AI Chat & Token Streaming** | **React (`.tsx`)** | Mount with `client:load` / `client:idle`. Use `useChatStream`. |
| **Immersion Timers & Deep Focus** | **React (`.tsx`)** | Mount with `client:load`. Clear intervals in cleanup phase. |
| **Audio Recorder & Waveforms** | **React (`.tsx`)** | Mount with `client:visible` or `client:idle`. Manage Web Audio API lifecycle. |
| **Drag-and-Drop / Live Reordering** | **React (`.tsx`)** | Declarative state sync with backend API. |

---

## 4. Architecture Pattern for React Islands

Every stateful island in `src/modules/{module}/ui/` must follow the **Container-Presentational Pattern**:

```
src/modules/{module}/ui/
├── components/           # Presentational: Pure functional React components (JSX + CSS tokens)
│   ├── MessageRow.tsx    # Stateless, renders strictly from props
│   └── ComposerBar.tsx   # Controlled inputs
├── hooks/                # Application/State: Custom hooks owning side-effects
│   └── useChatStream.ts  # Handles AbortController, ReadableStream, backpressure, retries
└── ChatAdvisorIsland.tsx # Container Island: Connects hooks with presentational UI
```

### Mandatory Island Rules:
1. **Always Handle Cleanup**: Every `useEffect` that opens a stream, worker, interval, or listener MUST return a cleanup function.
2. **AbortController First-Class**: Streaming network requests (`fetch`) MUST accept an `AbortSignal` so navigation unmounts abort in-flight requests cleanly.
3. **Use Phoenix CSS Tokens**: React components must style with class names consuming CSS variables from `src/styles/tokens.css` (e.g. `var(--surface)`, `var(--radius-large)`).
4. **Hydration Directive Discipline**:
   - `client:load`: Only for critical above-the-fold interactive features (e.g. Active Tunnel Timer).
   - `client:idle`: For secondary interactive modules (e.g. Chat Advisor widget, Reflection drawer).
   - `client:visible`: For components below the fold.

---

## 5. Pre-Merge Verification Checklist for Agents

Before completing any task involving client interactivity:
1. [ ] Is the reactive state managed declaratively with React (`.tsx`) instead of vanilla DOM scripts?
2. [ ] Are there zero calls to `document.createElement`, `innerHTML`, or manual DOM event wiring?
3. [ ] If streaming or timers are used, does the component properly abort/clear upon unmount?
4. [ ] Does the top-level Astro page only act as the orchestrator invoking the React island with typed initial props?
