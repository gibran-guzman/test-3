import { useEffect, useState } from "react";
import { useSubmit } from "react-router";
import type { Route } from "./+types/home";

import { db } from "~/services/db.server";
import { formatPrice } from "~/lib/format";
import { useDebounce } from "~/hooks/useDebounce";

import { Input } from "~/components/ui/input";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ProductSchema } from "~/models/product.schema";
import { AddProductDialog } from "~/components/product/AddProductDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fifty Flowers - Admin" },
    { name: "description", content: "Product Management Interface" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method Not Allowed" }, { status: 405 });
  }

  const formData = await request.formData();

  // Reconstruct nested payload from extracted flat formData
  const payload = {
    name: formData.get("name"),
    price: Number(formData.get("price")),
    stock_quantity: Number(formData.get("stock_quantity")),
    category: formData.get("category"),
    unit_of_sale: formData.get("unit_of_sale"),
    description: formData.get("description"),
    images: [
      {
        url: formData.get("imageUrl"),
        alt_text: formData.get("imageAlt"),
      },
    ],
  };

  const result = ProductSchema.omit({
    id: true,
    isDeleted: true,
    deletedAt: true,
  }).safeParse(payload);

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Add default properties explicitly required by the base schema
  const product = await db.create({
    ...result.data,
    isDeleted: false,
  });

  return Response.json({ success: true, product }, { status: 201 });
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const category = url.searchParams.get("category") || "";

  const products = await db.getAll({
    q: q || null,
    category: category && category !== "all" ? category : null,
  });

  return { products, q, category };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { products, q, category } = loaderData;
  const submit = useSubmit();

  const [searchQuery, setSearchQuery] = useState(q);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Trigger form submission when the debounced search value changes
  useEffect(() => {
    // Only submit if it differs from the server state to prevent infinite loops
    if (debouncedSearch !== q) {
      submit(
        { q: debouncedSearch, category: category || "all" },
        { replace: true }
      );
    }
  }, [debouncedSearch, q, category, submit]);

  const handleCategoryChange = (val: string) => {
    submit({ q: searchQuery, category: val }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background p-8 container mx-auto">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary">Fifty Flowers</h1>
          <p className="text-muted-foreground mt-2">
            Product Management Catalog
          </p>
        </div>
        <AddProductDialog />
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Input
          type="search"
          placeholder="Search products by name..."
          className="max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select value={category || "all"} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="roses">Roses</SelectItem>
            <SelectItem value="tulips">Tulips</SelectItem>
            <SelectItem value="sunflowers">Sunflowers</SelectItem>
            <SelectItem value="hydrangeas">Hydrangeas</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <main>
        {products.length === 0 ? (
          <div className="border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground text-lg">No products found.</p>
            <p className="text-sm text-muted-foreground/80 mt-1">
              Try adjusting your search or category filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted relative">
                  {product.images.length > 0 ? (
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].alt_text}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                <CardContent className="p-4 flex-1">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h2 className="font-semibold text-lg line-clamp-1">
                      {product.name}
                    </h2>
                    <Badge variant="secondary" className="capitalize">
                      {product.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {product.description}
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center justify-between">
                  <span className="font-bold text-primary">
                    {formatPrice(product.price, product.unit_of_sale)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Stock: {product.stock_quantity}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
