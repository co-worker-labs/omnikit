# CLAUDE.md — ByteCraft

# Stack: Typescript, Nextjs, React, Bootstrap

## PROJECT OVERVIEW

This is a production typescript frontend website. You are operating as a senior Typescript engineer.
Before any code change, read the relevant source files. Never assume structure.

## ARCHITECTURE RULES

### Simplicity first

Follow Go's "less is more" philosophy. Never abstract prematurely, never introduce
an unnecessary dependency.

- **YAGNI**: Implement only what the requirements document explicitly asks for.
- **Standard library first**: Always prefer the Go standard library over third-party packages.
- **Anti over-engineering**: Simple functions and plain structs beat complex interface hierarchies.

### React Compiler memoization

This project uses React Compiler (via `eslint-config-next/core-web-vitals`). The compiler
automatically memoizes values — **never manually write `useMemo`, `useCallback`, or `React.memo`**.

The ESLint rule `react-hooks/preserve-manual-memoization` will error if you write `useMemo` and
the compiler cannot preserve its semantics in the compiled output. Fix: remove the manual
memoization and let the compiler handle it.

```tsx
// ❌ WRONG — will fail eslint
const filtered = useMemo(() => list.filter(...), [list, search]);

// ✅ CORRECT — let React Compiler auto-memoize
const q = search.trim().toLowerCase();
const filtered = !q ? list : list.filter(...);
```

## RESPONSE PROTOCOL

### Before making changes

1. State which files you will read and modify, and why.

### Format for code changes

- Show diffs or complete functions, never decontextualized snippets.
- After changes: list every file modified and any required follow-up steps.
- Flag trade-offs explicitly: `// TODO(claude): review this tradeoff`

### Never do without asking

- Rename exported symbols
- Delete files or remove exported functions

### Solution quality

Always produce the technically correct solution for the problem at hand.
Do not cut corners to reduce implementation scope — if the right solution
requires more code, write it. If a simpler solution is genuinely correct,
prefer it (YAGNI). Correctness and simplicity are not in conflict.

## VERSION CONTROL

### Commit message format

Strictly follow Conventional Commits. Format: `<type>(<scope>): <subject>`

Common types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `perf`

Examples:

```
feat(auth): add refresh token rotation
fix(user): return 404 when profile not found
chore(deps): upgrade pgx to v5.6.0
```

When asked to generate a commit message, always use this format. Never generate
free-form commit messages.
