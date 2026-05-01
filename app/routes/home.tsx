import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fifty Flowers - Admin" },
    { name: "description", content: "Product Management Interface" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Fifty Flowers</h1>
        <p className="text-muted-foreground mt-2">Product Management Catalog</p>
      </header>
      <main>
        {/* Placeholder for Product List */}
        <div className="border border-border rounded-lg p-8 text-center text-muted-foreground">
          Products will be loaded here.
        </div>
      </main>
    </div>
  );
}
