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
import type { Company, Contact, Deal, PipelineStage } from "@/lib/types";
import { listCompanies } from "@/services/companies";
import { listContactsByCompany } from "@/services/contacts";
import { listStages } from "@/services/pipeline-stages";
import { createDeal, updateDeal, type DealInput } from "@/services/deals";

const NONE = "__none__";

interface DealFormState {
  company_id: string;
  contact_id: string | null;
  titulo: string;
  servico: string;
  valor: number | null;
  stage_id: string | null;
  data_prevista_fechamento: string | null;
}

function blank(companyId = ""): DealFormState {
  return {
    company_id: companyId,
    contact_id: null,
    titulo: "",
    servico: "",
    valor: null,
    stage_id: null,
    data_prevista_fechamento: null,
  };
}

export function DealFormDialog({
  open,
  onOpenChange,
  deal,
  fixedCompanyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  fixedCompanyId?: string;
  onSaved: () => void;
}) {
  const editing = !!deal;
  const [form, setForm] = useState<DealFormState>(blank(fixedCompanyId));
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);

  // Carrega lookups e estado inicial ao abrir.
  useEffect(() => {
    if (!open) return;
    listStages().then(setStages).catch(() => setStages([]));
    if (!fixedCompanyId) {
      listCompanies().then(setCompanies).catch(() => setCompanies([]));
    }
    setForm(
      deal
        ? {
            company_id: deal.company_id,
            contact_id: deal.contact_id,
            titulo: deal.titulo ?? "",
            servico: deal.servico ?? "",
            valor: deal.valor,
            stage_id: deal.stage_id,
            data_prevista_fechamento: deal.data_prevista_fechamento,
          }
        : blank(fixedCompanyId)
    );
  }, [open, deal, fixedCompanyId]);

  // Default de estágio = primeiro da lista (apenas ao criar).
  useEffect(() => {
    if (!editing && stages.length > 0) {
      setForm((f) => (f.stage_id ? f : { ...f, stage_id: stages[0].id }));
    }
  }, [stages, editing]);

  // Contatos dependem da empresa selecionada.
  useEffect(() => {
    if (open && form.company_id) {
      listContactsByCompany(form.company_id)
        .then(setContacts)
        .catch(() => setContacts([]));
    } else {
      setContacts([]);
    }
  }, [open, form.company_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_id) {
      toast.error("Selecione uma empresa");
      return;
    }
    setSaving(true);
    try {
      const payload: DealInput = {
        company_id: form.company_id,
        contact_id: form.contact_id,
        titulo: form.titulo || null,
        servico: form.servico || null,
        valor: form.valor,
        stage_id: form.stage_id,
        data_prevista_fechamento: form.data_prevista_fechamento || null,
      };
      if (editing) await updateDeal(deal!.id, payload);
      else await createDeal(payload);
      toast.success(editing ? "Negócio atualizado" : "Negócio criado");
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
          <DialogTitle>{editing ? "Editar negócio" : "Novo negócio"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!fixedCompanyId && (
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select
                value={form.company_id || undefined}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, company_id: v, contact_id: null }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) =>
                setForm((f) => ({ ...f, titulo: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="servico">Serviço</Label>
              <Input
                id="servico"
                value={form.servico}
                onChange={(e) =>
                  setForm((f) => ({ ...f, servico: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={form.valor ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    valor: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Estágio</Label>
              <Select
                value={form.stage_id ?? undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, stage_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contato</Label>
              <Select
                value={form.contact_id ?? NONE}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, contact_id: v === NONE ? null : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prev">Previsão de fechamento</Label>
            <Input
              id="prev"
              type="date"
              value={form.data_prevista_fechamento ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  data_prevista_fechamento: e.target.value || null,
                }))
              }
            />
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
