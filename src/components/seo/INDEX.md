# Index: `src/components/seo`

**Responsibility**: Componentes transversales para inyección de metadatos SEO, Open Graph, Twitter Cards y Schema.org JSON-LD.
**Architectural Layer**: Presentation / SEO Foundation Components

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`SeoHead.astro`](./SeoHead.astro) | Componente Head SSR | Inyección de title, meta description, canonical, OG, Twitter y JSON-LD | [`src/lib/seo/schema.ts`](../../lib/seo/schema.ts) |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
