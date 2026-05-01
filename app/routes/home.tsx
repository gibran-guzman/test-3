import { useEffect, useState } from "react";
import { useSubmit, useNavigation } from "react-router";
import type { Route } from "./+types/home";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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
import { Loader2 } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "roses", label: "Roses" },
  { value: "tulips", label: "Tulips" },
  { value: "sunflowers", label: "Sunflowers" },
  { value: "hydrangeas", label: "Hydrangeas" },
  { value: "mixed", label: "Mixed" },
] as const;

type ImagePayload = {
  url: string;
  alt_text: string;
};

async function persistUploadedImage(request: Request, file: File): Promise<string> {
  const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const fileExtension = path.extname(file.name) || ".bin";
  const fileName = `${Date.now()}-${crypto.randomUUID()}${fileExtension}`;
  const diskPath = path.join(uploadsDir, fileName);

  const bytes = new Uint8Array(await file.arrayBuffer());
  await fs.writeFile(diskPath, bytes);

  return new URL(`/uploads/${fileName}`, request.url).toString();
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fifty Flowers - Admin" },
    { name: "description", content: "Product Management Interface" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json(
      { success: false, error: "Method Not Allowed" },
      { status: 405 }
    );
  }

  let operation = "unknown";

  try {
    const formData = await request.formData();
    operation = (formData.get("_action") as string) || "unknown";
    const id = formData.get("id") as string | null;

    if (operation === "delete" && id) {
      await db.softDelete(id);
      return Response.json(
        { success: true, operation: "delete", id },
        { status: 200 }
      );
    }

    if (operation === "restore" && id) {
      await db.restore(id);
      return Response.json(
        { success: true, operation: "restore", id },
        { status: 200 }
      );
    }

    // Parse images payload JSON coming from the form
    const rawImages = formData.get("images_payload");
    let images: ImagePayload[] = [];
    if (rawImages) {
      try {
        const parsed = JSON.parse(rawImages as string) as ImagePayload[];
        if (Array.isArray(parsed)) {
          images = parsed;
        }
      } catch {
        // fallback
      }
    }

    const resolvedImages = await Promise.all(
      images.map(async (image, index) => {
        const uploadedFile = formData.get(`image_file_${index}`);
        if (uploadedFile instanceof File && uploadedFile.size > 0) {
          const persistedUrl = await persistUploadedImage(request, uploadedFile);
          return { ...image, url: persistedUrl };
        }
        return image;
      })
    );

    // Reconstruct nested payload from extracted flat formData for CREATE and UPDATE
    const payload = {
      name: formData.get("name"),
      price: Number(formData.get("price")),
      stock_quantity: Number(formData.get("stock_quantity")),
      category: formData.get("category"),
      unit_of_sale: formData.get("unit_of_sale"),
      description: formData.get("description"),
      images: resolvedImages,
    };

    const result = ProductSchema.omit({
      id: true,
      isDeleted: true,
      deletedAt: true,
    }).safeParse(payload);

    if (!result.success) {
      return Response.json(
        {
          success: false,
          operation,
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    if (operation === "update" && id) {
      const product = await db.update(id, result.data);
      return Response.json(
        { success: true, operation: "update", product },
        { status: 200 }
      );
    }

    const product = await db.create({
      ...result.data,
      isDeleted: false,
    });
    return Response.json(
      { success: true, operation: "create", product },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const lower = message.toLowerCase();
    const isNotFound =
      lower.includes("not found") || lower.includes("has been deleted");

    return Response.json(
      {
        success: false,
        operation,
        error: message,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

function DeleteProductButton({
  id,
  onDelete,
  triggerDisabled,
}: {
  id: string;
  onDelete: (id: string) => void;
  triggerDisabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    setOpen(false);
    onDelete(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={triggerDisabled}>
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
  const { products, q, categories } = loaderData;
  const submit = useSubmit();
  const navigation = useNavigation();

  const isPostSubmitting =
    navigation.state === "submitting" &&
    navigation.formMethod?.toLowerCase() === "post";
  const isListLoading = navigation.state === "loading";
  const isCatalogBusy = isListLoading || isPostSubmitting;

  const [searchQuery, setSearchQuery] = useState(q);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categories?.filter((value) => value !== "all") ?? []
  );
  const debouncedSearch = useDebounce(searchQuery, 300);
  const isSearchDebouncing = searchQuery !== debouncedSearch;

  useEffect(() => {
    setSelectedCategories(categories?.filter((value) => value !== "all") ?? []);
  }, [categories]);

  const submitFilters = (nextSearch: string, nextCategories: string[]) => {
    const formData = new FormData();
    formData.set("q", nextSearch);
    if (nextCategories.length === 0) {
      formData.set("category", "all");
    } else {
      nextCategories.forEach((categoryValue) => {
        formData.append("category", categoryValue);
      });
    }
    submit(formData, { replace: true });
  };

  // Trigger form submission when the debounced search value changes
  useEffect(() => {
    if (debouncedSearch !== q) {
      submitFilters(debouncedSearch, selectedCategories);
    }
  }, [debouncedSearch, q, selectedCategories]);

  const handleCategoryToggle = (categoryValue: string) => {
    const nextCategories = selectedCategories.includes(categoryValue)
      ? selectedCategories.filter((value) => value !== categoryValue)
      : [...selectedCategories, categoryValue];
    setSelectedCategories(nextCategories);
    submitFilters(searchQuery, nextCategories);
  };

  const clearCategories = () => {
    setSelectedCategories([]);
    submitFilters(searchQuery, []);
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
        <div className="relative max-w-sm w-full">
          <Input
            type="search"
            placeholder="Search products by name..."
            className="max-w-sm pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-busy={isSearchDebouncing || isListLoading}
          />
          {(isSearchDebouncing || isListLoading) && (
            <Loader2
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedCategories.length === 0 ? "default" : "outline"}
            onClick={clearCategories}
            disabled={isCatalogBusy}
          >
            All Categories
          </Button>
          {CATEGORY_OPTIONS.map((option) => {
            const isSelected = selectedCategories.includes(option.value);
            return (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "outline"}
                onClick={() => handleCategoryToggle(option.value)}
                disabled={isCatalogBusy}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {isSearchDebouncing && (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Searching…
        </p>
      )}

      <main className="relative min-h-[200px]">
        {isCatalogBusy && (
          <div
            className="absolute inset-0 z-10 flex items-start justify-center rounded-lg bg-background/60 pt-10 backdrop-blur-[1px]"
            aria-live="polite"
            aria-busy="true"
          >
            <span className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {isPostSubmitting ? "Applying changes…" : "Loading products…"}
            </span>
          </div>
        )}
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
                  <DeleteProductButton
                    id={product.id!}
                    onDelete={handleDelete}
                    triggerDisabled={isPostSubmitting}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
