"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowUpIcon, ArrowDownIcon, PencilIcon, TrashIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomField,
  deleteCustomField,
  moveCustomField,
  updateCustomField,
} from "@/app/actions/custom-fields";

export type FieldType = "texto" | "numero" | "fecha" | "lista" | "booleano";

export type CustomFieldDefinition = {
  id: string;
  name: string;
  fieldType: FieldType;
  options: string[] | null;
  teamId: string | null;
  teamName: string | null;
};

type TeamOption = { id: string; name: string };

const TYPE_LABEL_KEY: Record<FieldType, "typeText" | "typeNumber" | "typeDate" | "typeList" | "typeBoolean"> = {
  texto: "typeText",
  numero: "typeNumber",
  fecha: "typeDate",
  lista: "typeList",
  booleano: "typeBoolean",
};

function CustomFieldDialog({
  open,
  onOpenChange,
  field,
  teams,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: CustomFieldDefinition | null;
  teams: TeamOption[];
}) {
  const t = useTranslations("settings.customFields");
  const isEditing = field !== null;
  const [name, setName] = useState(field?.name ?? "");
  const [fieldType, setFieldType] = useState<FieldType>(field?.fieldType ?? "texto");
  const [options, setOptions] = useState<string[]>(field?.options ?? []);
  const [newOption, setNewOption] = useState("");
  const [teamId, setTeamId] = useState<string>(field?.teamId ?? "private");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      setName(field?.name ?? "");
      setFieldType(field?.fieldType ?? "texto");
      setOptions(field?.options ?? []);
      setNewOption("");
      setTeamId(field?.teamId ?? "private");
      setError(null);
    }
  }

  function addOption() {
    const value = newOption.trim();
    if (!value) return;
    setOptions((prev) => [...prev, value]);
    setNewOption("");
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const resolvedTeamId = teamId === "private" ? null : teamId;

    startTransition(async () => {
      const result = isEditing
        ? await updateCustomField({ id: field.id, name, options, teamId: resolvedTeamId })
        : await createCustomField({ name, fieldType, options, teamId: resolvedTeamId });

      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(isEditing ? t("updateSuccess") : t("createSuccess"));
      onOpenChange(false);
      router.refresh();
    });
  }

  const TYPE_OPTIONS: { value: FieldType; label: string }[] = [
    { value: "texto", label: t("typeText") },
    { value: "numero", label: t("typeNumber") },
    { value: "fecha", label: t("typeDate") },
    { value: "lista", label: t("typeList") },
    { value: "booleano", label: t("typeBoolean") },
  ];

  const VISIBILITY_OPTIONS = [
    { value: "private", label: t("visibilityPrivate") },
    ...teams.map((team) => ({ value: team.id, label: t("visibilityTeam", { team: team.name }) })),
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="field_name">{t("name")}</Label>
            <Input
              id="field_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              required
            />
          </div>

          {!isEditing && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="field_type">{t("type")}</Label>
              <Select
                items={TYPE_OPTIONS}
                value={fieldType}
                onValueChange={(v) => setFieldType(v as FieldType)}
              >
                <SelectTrigger id="field_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {fieldType === "lista" && (
            <div className="flex flex-col gap-2">
              <Label>{t("options")}</Label>
              <ul className="flex flex-col gap-1.5">
                {options.map((option, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="flex-1 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm">
                      {option}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeOption(index)}
                    >
                      <XIcon />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder={t("optionsPlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addOption}>
                  {t("addOption")}
                </Button>
              </div>
            </div>
          )}

          {teams.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="field_visibility">{t("visibility")}</Label>
              <Select
                items={VISIBILITY_OPTIONS}
                value={teamId}
                onValueChange={(v) => setTeamId(v ?? "private")}
              >
                <SelectTrigger id="field_visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomFieldsSection({
  fields,
  teams,
}: {
  fields: CustomFieldDefinition[];
  teams: TeamOption[];
}) {
  const t = useTranslations("settings.customFields");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [isPending, startTransition] = useTransition();
  const [movingId, setMovingId] = useState<string | null>(null);
  const router = useRouter();

  function openCreate() {
    setEditingField(null);
    setDialogOpen(true);
  }

  function openEdit(field: CustomFieldDefinition) {
    setEditingField(field);
    setDialogOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCustomField(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("deleteSuccess"));
      router.refresh();
    });
  }

  function handleMove(id: string, direction: "up" | "down") {
    setMovingId(id);
    startTransition(async () => {
      const result = await moveCustomField(id, direction);
      if (result.error) {
        toast.error(result.error);
      } else {
        router.refresh();
      }
      setMovingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <li
              key={field.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-medium">{field.name}</span>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{t(TYPE_LABEL_KEY[field.fieldType])}</Badge>
                  <Badge variant="secondary">
                    {field.teamId ? t("visibilityTeam", { team: field.teamName ?? "" }) : t("private")}
                  </Badge>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0 || (isPending && movingId === field.id)}
                  onClick={() => handleMove(field.id, "up")}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === fields.length - 1 || (isPending && movingId === field.id)}
                  onClick={() => handleMove(field.id, "down")}
                >
                  <ArrowDownIcon />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(field)}>
                  <PencilIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    if (window.confirm(t("deleteConfirm"))) handleDelete(field.id);
                  }}
                >
                  <TrashIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" className="w-fit" onClick={openCreate}>
        {t("add")}
      </Button>

      <CustomFieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        field={editingField}
        teams={teams}
      />
    </div>
  );
}
