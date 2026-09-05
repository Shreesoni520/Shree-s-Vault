"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock, Minus, Plus, Star, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { api, type Ingredient, type MealSlot, type Recipe } from "@/lib/client";
import { AISLES, UNITS } from "@/lib/defaults";
import { formatQty, parseTags, scaleQty } from "@/lib/recipes";
import { formatDay, weekdayLabel } from "@/lib/money";

export function RecipesView() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [editor, setEditor] = useState<Recipe | "new" | null>(null);
  const [active, setActive] = useState<Recipe | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [slots, setSlots] = useState<MealSlot[]>([]);

  const load = useCallback(async () => {
    const [recipeData, mealData] = await Promise.all([
      api<{ recipes: Recipe[] }>("/api/recipes"),
      api<{ dates: string[]; slots: MealSlot[] }>("/api/meals"),
    ]);
    setRecipes(recipeData.recipes);
    setDates(mealData.dates);
    setSlots(mealData.slots);
  }, []);

  useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : "Could not load recipes"));
  }, [load]);

  const allTags = [...new Set(recipes.flatMap((recipe) => parseTags(recipe.tags)))];
  const filtered = recipes.filter((recipe) => {
    const hay = `${recipe.title} ${recipe.tags} ${recipe.notes}`.toLowerCase();
    return hay.includes(q.toLowerCase()) && (!tag || parseTags(recipe.tags).includes(tag));
  });

  async function setMeal(date: string, recipeId: string | null) {
    try {
      await api("/api/meals", { method: "PUT", body: JSON.stringify({ date, recipeId }) });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not plan that day");
    }
  }

  async function shopWeek() {
    try {
      const data = await api<{ added: number }>("/api/meals/shop", { method: "POST" });
      toast.success(`Sent ${data.added} ingredients to grocery`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not shop the week");
    }
  }

  return (
    <div className="page-in mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Scale servings, tick what you need</p>
          <h1 className="font-heading mt-1 text-4xl tracking-tight">Recipe box</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search recipes" value={q} onChange={(event) => setQ(event.target.value)} className="w-56" />
          <Button
            onClick={() => {
              setActive(null);
              setEditor("new");
            }}
          >
            <Plus /> New recipe
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>This week</CardTitle>
            <CardDescription>Plan dinners, then send the lot to grocery.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => void shopWeek()}>
            Shop this week
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-2">
          {dates.map((date) => {
            const slot = slots.find((item) => item.date === date);
            return (
              <div key={date} className="rounded-xl border p-2">
                <p className="text-muted-foreground text-xs">
                  {weekdayLabel(date)} {formatDay(date)}
                </p>
                <Select
                  className="mt-2"
                  value={slot?.recipeId ?? ""}
                  onValueChange={(recipeId) => void setMeal(date, recipeId || null)}
                  options={[
                    { value: "", label: "—" },
                    ...recipes.map((recipe) => ({ value: recipe.id, label: recipe.title })),
                  ]}
                />
              </div>
            );
          })}
          </div>
        </CardContent>
      </Card>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={`rounded-full border px-2.5 py-0.5 text-xs ${tag === "" ? "bg-muted" : ""}`}
            onClick={() => setTag("")}
          >
            All tags
          </button>
          {allTags.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-full border px-2.5 py-0.5 text-xs ${tag === item ? "bg-muted" : ""}`}
              onClick={() => setTag(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Empty box</CardTitle>
            <CardDescription>Save a dish, then scale it for tonight and send ticked ingredients to grocery.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            className="rounded-xl border bg-card p-5 text-left ring-1 ring-foreground/8 transition-colors hover:bg-muted/30"
            onClick={() => setActive(recipe)}
          >
            <p className="font-heading flex items-start justify-between gap-2 text-2xl leading-tight">
              {recipe.title}
              {recipe.favorite && <Star className="size-4 fill-primary text-primary" />}
            </p>
            <p className="text-muted-foreground mt-3 flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {recipe.servings}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> {recipe.minutes} min
              </span>
              <span>{recipe.ingredients.length} ingredients</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-1">
              {parseTags(recipe.tags).map((tag) => (
                <span key={tag} className="rounded-full border px-2 py-0.5 text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <RecipeDialog
        open={editor !== null}
        onOpenChange={(next) => {
          if (!next) setEditor(null);
        }}
        recipe={editor === "new" ? null : editor}
        onSaved={async () => {
          setEditor(null);
          await load();
        }}
      />

      {active && editor === null && (
        <RecipeReader
          recipe={active}
          onClose={() => setActive(null)}
          onEdit={() => {
            setEditor(active);
            setActive(null);
          }}
          onChanged={async () => {
            await load();
            const next = await api<{ recipes: Recipe[] }>("/api/recipes");
            setActive(next.recipes.find((item) => item.id === active.id) ?? null);
          }}
        />
      )}
    </div>
  );
}

function emptyIngredient(): Ingredient {
  return { name: "", quantity: 1, unit: "", aisle: "Other" };
}

function RecipeDialog({
  open,
  onOpenChange,
  recipe,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(2);
  const [minutes, setMinutes] = useState(30);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);

  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title);
      setServings(recipe.servings);
      setMinutes(recipe.minutes);
      setTags(recipe.tags);
      setNotes(recipe.notes);
      setSourceUrl(recipe.sourceUrl ?? "");
      setIngredients(recipe.ingredients.length ? recipe.ingredients : [emptyIngredient()]);
    } else {
      setTitle("");
      setServings(2);
      setMinutes(30);
      setTags("");
      setNotes("");
      setSourceUrl("");
      setIngredients([emptyIngredient()]);
    }
  }, [recipe, open]);

  async function save() {
    try {
      const payload = { title, servings, minutes, tags, notes, sourceUrl, ingredients };
      if (recipe) await api(`/api/recipes/${recipe.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/recipes", { method: "POST", body: JSON.stringify(payload) });
      toast.success(recipe ? "Recipe saved" : "Recipe added");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save recipe");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recipe ? "Edit recipe" : "New recipe"}</DialogTitle>
          <DialogDescription>Write the base servings. You can scale them later when cooking.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 flex flex-col gap-2">
            <Label>Title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Servings</Label>
            <Input type="number" min={1} value={servings} onChange={(event) => setServings(Number(event.target.value))} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Minutes</Label>
            <Input type="number" min={1} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tags</Label>
            <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="weeknight, vegetarian" />
          </div>
          <div className="col-span-3 flex flex-col gap-2">
            <Label>Source URL</Label>
            <Input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" />
          </div>
          <div className="col-span-3 flex flex-col gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Ingredients</Label>
            <Button variant="outline" size="sm" onClick={() => setIngredients((rows) => [...rows, emptyIngredient()])}>
              Add row
            </Button>
          </div>
        <div className="flex max-h-52 flex-col gap-2 overflow-auto pr-1">
          {ingredients.map((row, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_72px_88px_118px_32px]">
              <Input
                placeholder="Name"
                value={row.name}
                onChange={(event) =>
                  setIngredients((rows) => rows.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))
                }
              />
              <Input
                type="number"
                step="0.01"
                value={row.quantity}
                onChange={(event) =>
                  setIngredients((rows) =>
                    rows.map((item, i) => (i === index ? { ...item, quantity: Number(event.target.value) } : item))
                  )
                }
              />
              <Select
                value={row.unit}
                onValueChange={(unit) =>
                  setIngredients((rows) => rows.map((item, i) => (i === index ? { ...item, unit } : item)))
                }
                options={UNITS.map((unit) => ({ value: unit, label: unit || "unit" }))}
              />
              <Select
                value={row.aisle}
                onValueChange={(aisle) =>
                  setIngredients((rows) => rows.map((item, i) => (i === index ? { ...item, aisle } : item)))
                }
                options={AISLES.map((aisle) => ({ value: aisle, label: aisle }))}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIngredients((rows) => rows.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void save()}>Save recipe</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipeReader({
  recipe,
  onClose,
  onEdit,
  onChanged,
}: {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const [servings, setServings] = useState(recipe.servings);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setServings(recipe.servings);
    setChecked({});
  }, [recipe]);

  const scaled = useMemo(
    () =>
      recipe.ingredients.map((item) => ({
        ...item,
        scaled: Number(formatQty(scaleQty(item.quantity, recipe.servings, servings))),
      })),
    [recipe, servings]
  );

  const ticked = Object.values(checked).filter(Boolean).length;

  async function sendToGrocery() {
    const ingredientIds = recipe.ingredients.filter((item) => item.id && checked[item.id]).map((item) => item.id) as string[];
    if (!ingredientIds.length) {
      toast.error("Tick the ingredients you need first.");
      return;
    }
    try {
      await api("/api/grocery", {
        method: "POST",
        body: JSON.stringify({ fromRecipeId: recipe.id, ingredientIds, servings }),
      });
      toast.success(`Added ${ingredientIds.length} items to grocery`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add to grocery");
    }
  }

  async function toggleFavorite() {
    try {
      await api(`/api/recipes/${recipe.id}`, { method: "PUT", body: JSON.stringify({ favorite: !recipe.favorite }) });
      toast.success(recipe.favorite ? "Removed from favourites" : "Marked favourite");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update");
    }
  }

  async function duplicate() {
    try {
      await api(`/api/recipes/${recipe.id}/duplicate`, { method: "POST" });
      toast.success("Recipe copied");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy");
    }
  }

  function selectAll(value: boolean) {
    const next: Record<string, boolean> = {};
    for (const item of recipe.ingredients) {
      if (item.id) next[item.id] = value;
    }
    setChecked(next);
  }

  async function remove() {
    if (!window.confirm(`Delete “${recipe.title}”?`)) return;
    try {
      await api(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      toast.success("Recipe deleted");
      await onChanged();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    }
  }

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl">{recipe.title}</DialogTitle>
          <DialogDescription>
            Base {recipe.servings} servings · {recipe.minutes} minutes
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <Label>Scale to</Label>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setServings((current) => Math.max(1, current - 1))}
            >
              <Minus />
            </Button>
            <span className="min-w-8 text-center text-sm tabular-nums">{servings}</span>
            <Button variant="ghost" size="icon-xs" onClick={() => setServings((current) => current + 1)}>
              <Plus />
            </Button>
          </div>
          <span className="text-muted-foreground text-sm">servings</span>
          <Button variant="ghost" size="icon-xs" onClick={() => void toggleFavorite()} aria-label="Favourite">
            <Star className={recipe.favorite ? "fill-primary text-primary" : ""} />
          </Button>
          <Button variant="outline" onClick={() => void duplicate()}>
            Copy
          </Button>
          <Button variant="outline" className="ml-auto" onClick={onEdit}>
            Edit
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={() => selectAll(true)}>
            Tick all
          </Button>
          <Button variant="ghost" size="xs" onClick={() => selectAll(false)}>
            Clear ticks
          </Button>
        </div>
        <div className="flex max-h-72 flex-col gap-1.5 overflow-auto">
          {scaled.map((item) => (
            <label key={item.id ?? item.name} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40">
              <Checkbox
                checked={Boolean(item.id && checked[item.id])}
                onChange={(value) => setChecked((current) => ({ ...current, [item.id ?? item.name]: value }))}
              />
              <span className="flex-1 text-sm">{item.name}</span>
              <span className="text-muted-foreground text-sm tabular-nums">
                {formatQty(item.scaled)} {item.unit}
              </span>
              <span className="text-muted-foreground w-16 text-right text-xs">{item.aisle}</span>
            </label>
          ))}
        </div>
        {recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="text-primary text-sm underline-offset-4 hover:underline">
            Source
          </a>
        )}
        {recipe.notes && <p className="text-sm leading-6">{recipe.notes}</p>}
        <DialogFooter>
          <Button variant="destructive" className="mr-auto" onClick={() => void remove()}>
            Delete
          </Button>
          <Button onClick={() => void sendToGrocery()}>
            {ticked ? `Add ${ticked} to grocery` : "Add ticked to grocery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
