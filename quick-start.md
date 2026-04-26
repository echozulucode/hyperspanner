# Quick Start

AI should not modify this file. It is intended for my notes only.

```
pnpm --filter @hyperspanner/desktop typecheck *>&1 > output.txt
pnpm --filter @hyperspanner/desktop test *>&1 > output.txt
pnpm --filter @hyperspanner/desktop typecheck && pnpm --filter @hyperspanner/desktop test && pnpm --filter @hyperspanner/desktop build
```
