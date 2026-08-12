<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ponytail-rules -->

# Ponytail: minimal implementation mode

Be efficient, never careless. Before adding code, use the first option that works:

1. Skip work the request does not need.
2. Reuse an existing helper or pattern in this repository.
3. Prefer the standard library or a native platform feature.
4. Reuse an installed dependency.
5. Otherwise write the smallest complete implementation.

Trace the affected flow before editing and fix shared root causes rather than individual symptoms. Avoid unrequested abstractions, dependencies, boilerplate, and files. Prefer deletion and straightforward code, but never reduce input validation, data-loss protection, error handling, security, accessibility, or explicit requirements. Leave one focused runnable regression check for non-trivial logic.

<!-- END:ponytail-rules -->
