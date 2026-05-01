import { useEffect, useState } from "react";
import { useSubmit, useFetcher } from "react-router";
import type { Route } from "./+types/home";

import { db } from "~/services/db.server";
import { formatPrice } from "~/lib/format";
import { useDebounce } from "~/hooks/useDebounce";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ProductSchema } from "~/models/product.schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "~/components/ui/dialog";
import { ProductFormDialog } from "~/components/product/ProductFormDialog";
import { toast } from "sonner";
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
  const _action = formData.get("_action") as string;
  const id = formData.get("id") as string | null;

  if (_action === "delete" && id) {
    await db.softDelete(id);
    return Response.json({ success: true, operation: "delete", id }, { status: 200 });
  }

  if (_action === "restore" && id) {
    await db.restore(id);
    return Response.json({ success: true, operation: "restore", id }, { status: 200 });
  }

  // Parse images payload JSON coming from the form
  const rawImages = formData.get("images_payload");
  let images = [];
  if (rawImages) {
    try {
      images = JSON.parse(rawImages as string);
    } catch {
      // fallback
    }
  }

  // Reconstruct nested payload from extracted flat formData for CREATE and UPDATE
  const payload = {
    name: formData.get("name"),
    price: Number(formData.get("price")),
    stock_quantity: Number(formData.get("stock_quantity")),
    category: formData.get("category"),
    unit_of_sale: formData.get("unit_of_sale"),
    description: formData.get("description"),
    images,
  };

  const result = ProductSchema.omit({
    id: true,
    isDeleted: true,
    deletedAt: true,
  }).safeParse(payload);

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten().fieldErrors, operation: _action },
      { status: 400 }
    );
  }

  if (_action === "update" && id) {
    const product = await db.update(id, result.data);
    return Response.json({ success: true, operation: "update", product }, { status: 200 });
  } else {
    // Fallback to Create
    const product = await db.create({
      ...result.data,
      isDeleted: false,
    });
    return Response.json({ success: true, operation: "create", product }, { status: 201 });
  }
}

function DeleteProductButton({ id, onDelete }: { id: string, onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setOpen(false);
    onDelete(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action will soft-delete the product from the catalog. You will have 5 seconds to undo it via the notification that appears.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const rawCategories = url.searchParams
    .getAll("category")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  const category = rawCategories[0] || "";

  const products = await db.getAll({
    q: q || null,
    categories:
      rawCategories.length > 0 && !rawCategories.includes("all")
        ? rawCategories
        : null,
    category: category && category !== "all" ? category : null,
  });

  return { products, q, category, categories: rawCategories };
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

  const handleDelete = (id: string) => {
    submit({ _action: "delete", id }, { method: "POST" });
    
    toast.success("Product soft-deleted successfully", {
      action: {
        label: "Undo",
        onClick: () => {
          submit({ _action: "restore", id }, { method: "POST" });
        },
      },
      duration: 5000,
    });
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
        <ProductFormDialog />
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
                <div className="px-4 pb-2 flex items-center justify-between">
                  <span className="font-bold text-primary">
                    {formatPrice(product.price, product.unit_of_sale)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Stock: {product.stock_quantity}
                  </span>
                </div>
                <CardFooter className="p-4 pt-2 flex items-center justify-end gap-2 border-t mt-auto">
                  <ProductFormDialog
                    product={product}
                    trigger={<Button variant="outline" size="sm">Edit</Button>}
                  />
                  <DeleteProductButton id={product.id!} onDelete={handleDelete} />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
