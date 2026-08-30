"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SearchIcon, Building2Icon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchClients, type SearchResult } from "@/app/actions/search";

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    // El propio Dialog mueve el foco dentro al abrir; nos aseguramos de que
    // caiga en el campo de texto, no en el primer elemento genérico.
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const { results: found } = await searchClients(query);
      setResults(found);
      setActiveIndex(0);
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  function goTo(result: SearchResult) {
    onOpenChange(false);
    router.push(`/clientes/${result.id}`);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) goTo(selected);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-24 max-w-lg translate-y-0 gap-0 p-0" showCloseButton={false}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="border-none px-0 shadow-none focus-visible:ring-0"
            aria-label={t("title")}
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("hint")}</p>
          ) : loading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("noResults")}</p>
          ) : (
            <ul>
              {results.map((r, index) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => goTo(r)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 ${
                      index === activeIndex ? "bg-accent" : ""
                    }`}
                  >
                    <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex flex-col">
                      <span className="font-medium">{r.companyName}</span>
                      {r.matchedContact && (
                        <span className="text-xs text-muted-foreground">{r.matchedContact}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
