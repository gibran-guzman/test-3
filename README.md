# Fifty Flowers Product Management System

A comprehensive product management interface for Fifty Flowers' flower catalog with full CRUD operations, media handling, search, and filtering capabilities.

## Problem Statement

Provides an internal management system for flower products that enables complete product lifecycle management including creation, editing, deletion with soft-delete and undo functionality, image management with drag-and-drop reordering, and advanced search/filtering capabilities.

## Tech Stack

- **Framework**: React Router 7
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Forms**: React Hook Form + Zod v4
- **Database**: JSON file storage with in-memory singleton
- **Drag & Drop**: @dnd-kit/sortable
- **Testing**: Vitest
- **Build Tool**: Vite

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd test-3

# Install dependencies
npm install

# Start development server
npm run dev
```

## Quick Start

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Open http://localhost:5173 in your browser
4. Use the interface to manage flower products with full CRUD operations

## Project Structure

```
test-3/
├── app/                          # Main application directory
│   ├── components/               # Reusable UI components
│   │   ├── product/             # Product-specific components
│   │   │   ├── ProductFormDialog.tsx
│   │   │   ├── ProductImageGallery.tsx
│   │   │   └── SortableImageItem.tsx
│   │   └── ui/                  # shadcn/ui components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── sonner.tsx
│   │       └── table.tsx
│   ├── hooks/                    # Custom React hooks
│   │   └── useDebounce.ts       # Debounce hook for search
│   ├── lib/                      # Utility libraries
│   │   ├── format.ts             # Formatting utilities
│   │   └── utils.ts              # General utilities
│   ├── models/                   # Data models and schemas
│   │   ├── product.schema.ts     # Zod schema for products
│   │   └── product.schema.test.ts # Schema tests
│   ├── routes/                   # Application routes
│   │   └── home.tsx             # Main home route
│   ├── services/                 # Service layer
│   │   └── db.server.ts         # Database service
│   ├── app.css                   # Global styles
│   ├── root.tsx                  # Root component
│   └── routes.ts                 # Route definitions
├── data/                         # Data storage
│   └── products.json             # Product data file
├── public/                       # Static assets
│   └── uploads/                 # Uploaded images
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts               # Vite configuration
├── vitest.config.ts             # Vitest test configuration
└── README.md                    # This documentation
```

## Environment Variables

No environment variables are required for the basic implementation. The application uses JSON file storage with in-memory persistence.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

The project includes Vitest tests for the Zod product schema covering happy path and edge cases.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run tests

## Key Features

- **Product CRUD**: Create, read, update, and delete flower products
- **Image Management**: Upload multiple images with drag-and-drop reordering
- **Search & Filter**: Real-time search with 300ms debounce and category filtering
- **Soft Delete**: Products are soft-deleted with undo functionality
- **Form Validation**: Comprehensive validation using Zod schemas
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS

## Data Model

```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  unit_of_sale: "stem" | "bunch" | "bouquet";
  description: string;
  category: "roses" | "tulips" | "sunflowers" | "hydrangeas" | "mixed";
  images: { url: string; alt_text: string }[];
  isDeleted?: boolean;
  deletedAt?: string;
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and ensure tests pass
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Open a Pull Request

## Technical Decisions

- **React Router 7**: Chosen for its modern routing capabilities and SSR support
- **Zod v4**: Provides runtime type validation with excellent TypeScript integration
- **@dnd-kit/sortable**: Implements accessible drag-and-drop functionality
- **JSON File Storage**: Simple, lightweight solution for the technical test requirements
- **shadcn/ui**: Provides accessible, customizable UI components with excellent TypeScript support
