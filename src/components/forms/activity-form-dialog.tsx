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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/constants";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/format";
import type { ActivityType, Company, Contact, Deal } from "@/lib/types";
import type { ActivityWithRelations } from "@/lib/types";
import { listCompanies } from "@/services/companies";
import { listContactsByCompany } from "@/services/contacts";
import { listDealsByCompany } from "@/services/deals";
import {
  createActivity,
  updateActivity,
  type ActivityInput,
} from "@/services/activities";

const NONE = "__none__";

interface ActivityFormState {
  company_id: string | null;
  deal_id: string | null;
  contact_id: string | null;
  tipo: ActivityType;
  descricao: string;
  data: string; // datetime-local value
  concluida: boolean;
}

function blank(companyId: string | null = null): ActivityFormState {
  return {
    company_id: companyId,
    deal_id: null,
    contact_id: null,
    tipo: "nota",
    descricao: "",
    data: toDatetimeLocalValue(null),
    concluida: false,
  };
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  activity,
  fixedCompanyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: ActivityWithRelations | null;
  fixedCompanyId?: string;
  onSaved: () => void;
}) {
  const editing = !!activity;
  const [form, setForm] = useState<ActivityFormState>(
    blank(fixedCompanyId ?? null)
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      activity
        ? {
            company_id: activity.company_id,
            deal_id: activity.deal_id,
            contact_id: activity.contact_id,
            tipo: activity.tipo,
            descricao: activity.descricao ?? "",
            data: toDatetimeLocalValue(activity.data),
            concluida: activity.concluida,
          }
        : blank(fixedCompanyId ?? null)
    );
    if (!fixedCompanyId) {
      listCompanies().then(setCompanies).catch(() => setCompanies([]));
    }
  }, [open, activity, fixedCompanyId]);

  // Deals e contatos dependem da empresa.
  useEffect(() => {
    if (open && form.company_id) {
      listDealsByCompany(form.company_id)
        .then(setDeals)
        .catch(() => setDeals([]));
      listContactsByCompany(form.company_id)
        .then(setContacts)
        .catch(() => setContacts([]));
    } else {
      setDeals([]);
      setContacts([]);
    }
  }, [open, form.company_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: ActivityInput = {
        company_id: form.company_id,
        deal_id: form.deal_id,
        contact_id: form.contact_id,
        tipo: form.tipo,
        descricao: form.descricao || null,
        data: fromDatetimeLocalValue(form.data),
        concluida: form.concluida,
      };
      if (editing) await updateActivity(activity!.id, payload);
      else await createActivity(payload);
      toast.success(editing ? "Atividade atualizada" : "Atividade criada");
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
          <DialogTitle>
            {editing ? "Editar atividade" : "Nova atividade"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, tipo: v as ActivityType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data/hora *</Label>
              <Input
                id="data"
                type="datetime-local"
                required
                value={form.data}
                onChange={(e) =>
                  setForm((f) => ({ ...f, data: e.target.value }))
                }
              />
            </div>
          </div>

          {!fixedCompanyId && (
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={form.company_id ?? NONE}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    company_id: v === NONE ? null : v,
                    deal_id: null,
                    contact_id: null,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhuma</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Negócio</Label>
              <Select
                value={form.deal_id ?? NONE}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, deal_id: v === NONE ? null : v }))
                }
                disabled={!form.company_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.titulo || d.servico || "Negócio"}
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
                disabled={!form.company_id}
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
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.concluida}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, concluida: v === true }))
              }
            />
            Concluída
          </label>

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
