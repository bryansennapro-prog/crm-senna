"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LIFECYCLE_OPTIONS } from "@/lib/constants";
import type { Company, LifecycleStage } from "@/lib/types";
import {
  createCompany,
  updateCompany,
  type CompanyInput,
} from "@/services/companies";

function blank(): CompanyInput {
  return {
    nome: "",
    nicho: "",
    telefone: "",
    instagram: "",
    cidade: "",
    origem: "",
    lifecycle_stage: "lead",
  };
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  onSaved: () => void;
}) {
  const editing = !!company;
  const [form, setForm] = useState<CompanyInput>(blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      company
        ? {
            nome: company.nome,
            nicho: company.nicho ?? "",
            telefone: company.telefone ?? "",
            instagram: company.instagram ?? "",
            cidade: company.cidade ?? "",
            origem: company.origem ?? "",
            lifecycle_stage: company.lifecycle_stage,
          }
        : blank()
    );
  }, [open, company]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await updateCompany(company!.id, form);
      else await createCompany(form);
      toast.success(editing ? "Empresa atualizada" : "Empresa criada");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar empresa" : "Nova empresa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nicho">Nicho</Label>
              <Input
                id="nicho"
                value={form.nicho ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nicho: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={form.cidade ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cidade: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telefone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                placeholder="@perfil"
                value={form.instagram ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instagram: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <Input
                id="origem"
                placeholder="Indicação, Instagram..."
                value={form.origem ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, origem: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Estágio (lifecycle)</Label>
              <Select
                value={form.lifecycle_stage}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    lifecycle_stage: v as LifecycleStage,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIFECYCLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
