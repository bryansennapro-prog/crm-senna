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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Company, Contact } from "@/lib/types";
import { listCompanies } from "@/services/companies";
import {
  createContact,
  updateContact,
  type ContactInput,
} from "@/services/contacts";

function blank(companyId = ""): ContactInput {
  return {
    company_id: companyId,
    nome: "",
    telefone_whatsapp: "",
    email: "",
    cargo: "",
    e_decisor: false,
  };
}

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  fixedCompanyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  fixedCompanyId?: string;
  onSaved: () => void;
}) {
  const editing = !!contact;
  const [form, setForm] = useState<ContactInput>(blank(fixedCompanyId));
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      contact
        ? {
            company_id: contact.company_id ?? "",
            nome: contact.nome,
            telefone_whatsapp: contact.telefone_whatsapp ?? "",
            email: contact.email ?? "",
            cargo: contact.cargo ?? "",
            e_decisor: contact.e_decisor,
          }
        : blank(fixedCompanyId)
    );
    if (!fixedCompanyId) {
      listCompanies().then(setCompanies).catch(() => setCompanies([]));
    }
  }, [open, contact, fixedCompanyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_id) {
      toast.error("Selecione uma empresa");
      return;
    }
    setSaving(true);
    try {
      if (editing) await updateContact(contact!.id, form);
      else await createContact(form);
      toast.success(editing ? "Contato atualizado" : "Contato criado");
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
          <DialogTitle>{editing ? "Editar contato" : "Novo contato"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!fixedCompanyId && (
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select
                value={form.company_id || undefined}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, company_id: v }))
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
              <Label htmlFor="whatsapp">Telefone / WhatsApp</Label>
              <Input
                id="whatsapp"
                value={form.telefone_whatsapp ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telefone_whatsapp: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={form.cargo ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cargo: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.e_decisor}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, e_decisor: v === true }))
              }
            />
            É decisor
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
