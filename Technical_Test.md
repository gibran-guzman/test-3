# Fifty Flowers — Senior Full Stack Technical Test

## Overview

Build a small product management interface for Fifty Flowers' catalog. The interface must let an internal user manage flower products with full CRUD, media handling, search and filtering. Senior-level concerns (optimistic UI, soft delete with undo, async validation, testing) are offered as **optional bonuses** — they are not required to pass, but they are valuable signals.

Estimated effort: **3.5h** for the required scope, **+1h** if you tackle 1-2 bonuses.

## Product Data Structure

```ts
interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  unit_of_sale: "stem" | "bunch" | "bouquet";
  description: string;
  category: "roses" | "tulips" | "sunflowers" | "hydrangeas" | "mixed";
  images: { url: string; alt_text: string }[];
}
```

### Validation rules

| Field | Rule |
|---|---|
| `name` | required, string, 3-80 chars |
| `price` | required, number, >= 0.01 |
| `stock_quantity` | required, integer, >= 0 |
| `unit_of_sale` | required, enum |
| `description` | required, string, 10-200 chars |
| `category` | required, enum |
| `images[].url` | required, valid URL |
| `images[].alt_text` | required, non-empty string |

The price displayed in the list MUST format with the unit (e.g. `"$12.50 / bunch"`, `"$3.00 / stem"`, `"$45.00 / bouquet"`). Pluralization is up to you, but be consistent.

## Required features

1. **List products** in a grid or table. Show: primary image, name, formatted price (with unit), stock, category.
2. **Create product** via form with validation.
3. **Edit product** via form, preloading current values.
4. **Delete product** with explicit confirmation step.
5. **Upload media** for a product (multiple images allowed).
6. **Reorder images** using **`@dnd-kit/sortable`** drag-and-drop. Button-based reorder is **not** acceptable.
7. **`alt_text` is mandatory** for every image — both in the form and persisted on save.
8. **Search by name** in the list with **300ms debounce**.
9. **Filter by category** in the list (multi-select).

## Bonuses (optional)

These are **not required** and their absence does **not** disqualify your submission. Pick any you want to demonstrate Senior-level depth — quality matters more than quantity.

- **Sort** by name (asc/desc) and price (asc/desc) in the list.
- **Optimistic UI with rollback**: delete and edit show optimistic state and revert visibly on error. Simulate failure with a `?fail=1` query param.
- **Soft delete + Undo**: deletion is soft and a `sonner` toast offers Undo for **5 seconds**.
- **Name uniqueness async refine** in Zod — server-side check against the data store.
- **At least 1 Vitest test** of the Zod schema covering happy path and 2 edge cases.

## Technical requirements

- **Framework**: **React Router 7** (`react-router@^7`). Remix v1 is not accepted.
- **Styling**: **Tailwind CSS v4**.
- **UI components**: **shadcn/ui** installed via CLI (`npx shadcn@latest add ...`). Custom-built primitives are not accepted as a substitute.
- **Forms**: **react-hook-form** + **Zod v4** with `@hookform/resolvers`.
- **TypeScript**: strict, **no `any`**.
- **Drag-and-drop**: **`@dnd-kit/sortable`** for image reorder.
- **Persistence**: a JSON file (`data/products.json`) with an in-memory singleton during runtime is sufficient. No external database required.

For bonuses you may add: `sonner` (toasts), `vitest` (testing). Free choice for optimistic UI implementation (`useFetcher`, TanStack Query, etc.).

## What we're NOT testing

- Accessibility beyond `alt_text` on images
- URL state management (nuqs is fine but not required)
- Lazy loading
- Authentication
- Complex animations
- Pagination

## Deliverables

1. **GitHub repository** with a clear `README.md` (setup, run, brief notes on technical decisions).
2. **Pull Request** opened against this repository:

   `https://github.com/fifty-git/test-3`

3. **Demo**: a short video walkthrough or a deployed link (Vercel/Netlify/Fly).
