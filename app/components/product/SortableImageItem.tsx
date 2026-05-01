import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface SortableImageItemProps {
  id: string;
  url: string;
  index: number;
  error?: string;
  registerAlt: any;
  onRemove: () => void;
}

export function SortableImageItem({
  id,
  url,
  index,
  error,
  registerAlt,
  onRemove,
}: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-start gap-4 p-3 border rounded-md bg-background ${
        isDragging ? "border-primary shadow-lg" : "border-border"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="size-5" />
      </div>

      <img
        src={url}
        alt={`Preview ${index}`}
        className="w-16 h-16 object-cover rounded-md border"
      />

      <div className="flex-1 space-y-2">
        <Label htmlFor={`alt-${id}`} className="sr-only">
          Alt Text
        </Label>
        <Input
          id={`alt-${id}`}
          placeholder="Describe the image (mandatory)..."
          {...registerAlt}
          className={error ? "border-destructive" : ""}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}