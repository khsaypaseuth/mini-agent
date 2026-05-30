# MiniAgent — Claude Code Development Guidelines

> Read `UBIQUITOUS_LANGUAGE.md` before planning any feature. Every term matters.

---

## 0. Before you write a single line of code

Use the `grill-me` skill. Never skip it for non-trivial work.
Reach shared understanding on:
1. The **public interface** the module will expose (what callers see)
2. The **test** that will prove it works (write it first)
3. Which **deep module** owns the logic

---

## 1. TypeScript Standards — Matt Pocock Style

### No TypeScript `enum` — use const objects + derived union types

```ts
// ❌ Never do this
enum UserRole { CUSTOMER = 'customer' }

// ✅ Always do this
export const UserRole = {
  CUSTOMER: 'customer',
  BACK_OFFICE_STAFF: 'back_office_staff',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
```

### Branded types for all domain IDs
Never pass a plain `string` where a domain ID is expected.

```ts
// All ID types live in packages/types/src/branded.ts
function getRequest(id: RequestId) { ... }      // ✅ compiler-enforced
function getRequest(id: string) { ... }          // ❌ too loose
```

### Other rules
- **`satisfies` operator** for config/seed objects — catches shape errors without widening
- **No `any`** — use `unknown` and narrow. If truly unavoidable, use `@ts-expect-error` with a comment explaining why
- **Explicit return types** on all exported functions
- **`import type`** for type-only imports
- **Zod schemas** at every system boundary (HTTP request bodies, webhook payloads, env vars)
- **No barrel re-exports** (`export * from`) unless the package is explicitly a types/barrel package

---

## 2. Module Architecture — Deep Modules (Ousterhout)

Design **a few large modules that hide complexity behind simple interfaces**.
The AI should only need to look at the interface to use a module.

| Module | Owns | Interface shape |
|--------|------|-----------------|
| `AuthModule` | JWT lifecycle, OTP, RBAC guards, CASL policies | `AuthService`, `JwtAuthGuard`, `Roles()` decorator |
| `ServicesModule` | Service catalog, pricing engine, delivery options | `ServicesService`, `PricingEngine` |
| `RequestsModule` | Request lifecycle, state machine, history | `RequestsService`, `StateMachine` |
| `DeliveryModule` | Distance API, fee calculation, delivery workflow | `DeliveryService`, `FeeCalculator` |
| `PaymentModule` | `PaymentProvider` interface, Phapay adapter, webhook | `PaymentService` |
| `NotificationModule` | WhatsApp, email, push — all outbound comms | `NotificationService` |
| `FileModule` | MinIO uploads, signed URLs, QR/label generation | `FileService` |

Rules:
- Internal helpers, repositories, and sub-services are **private to the module**
- Only the module's barrel (`index.ts`) is imported by other modules
- Cross-module calls go through the **public service interface only**, never directly to a repository

---

## 3. TDD — Mandatory for Business Logic

For every method that encodes a business rule:

```
1. Write the test → watch it FAIL (red)
2. Write the minimum code to pass → watch it PASS (green)
3. Refactor → still green
```

**Priority test coverage (in order):**
1. `PricingEngine` — pricing tier selection, per-person/per-vehicle calculations
2. `FeeCalculator` — distance → delivery fee tier mapping (5/10/15/20 km bands)
3. `StateMachine` — all valid and invalid request status transitions
4. `AuthService` — JWT sign/verify, OTP expiry/consumption
5. Payment webhook idempotency

Never move to the next test until the current one is green.

---

## 4. Interface-First Design

**Human designs the interface. AI implements the internals.**

Workflow for each new module:
1. Write the service interface (method signatures + JSDoc) — **you do this**
2. Write the outer boundary tests against the interface — **you do this**
3. Implement the internals — **delegate to AI**
4. Review the diff for correctness and entropy — **you do this**

---

## 5. Git & Branch Discipline

- Branch: `feature/<phase>-<short-desc>` off `develop`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `refactor:`)
- PR: `develop` ← `feature/*`
- Phase end: `develop` → `main` via PR

---

## 6. Available Skills (use them)

| Task | Skill |
|------|-------|
| Align on design before coding | `grill-me` |
| Plan a phase | `gsd-plan-phase` |
| Execute a plan | `gsd-execute-phase` |
| Code review | `gsd-code-review` / `code-review` |
| Debug | `gsd-debug` |
| UI work | `frontend-design` |
| Large output analysis | `context-mode` |
| Deep module review | `deep-module-review` |
| Audit trail check | `audit-check` |
| i18n check | `i18n-check` |
| Idempotency check | `idempotency-check` |

---

## 7. Anti-patterns — Never Do These

- Hardcode any of the 8 services in business logic (they are seed rows)
- Skip writing a failing test before implementing a business rule
- Create a NestJS module with more than ~5 public exports
- Use `string` where a branded ID type exists
- Add a new locale string anywhere except `packages/i18n/locales/*.json`
- Commit `.env` files or real secrets
- Use `console.log` in production code — use NestJS `Logger`
