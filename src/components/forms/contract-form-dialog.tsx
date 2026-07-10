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
import { CONTRACT_STATUS_OPTIONS } from "@/lib/constants";
import type { Company, Contract, ContractStatus } from "@/lib/types";
import { listCompanies } from "@/services/companies";
import {
  createContract,
  updateContract,
  type ContractInput,
} from "@/services/contracts";

function blank(companyId = ""): ContractInput {
  return {
    company_id: companyId,
    deal_id_origem: null,
    servico: "",
    valor: null,
    recorrente: false,
    data_inicio: null,
    data_renovacao: null,
    status: "ativo",
  };
}

export function ContractFormDialog({
  open,
  onOpenChange,
  contract,
  fixedCompanyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract | null;
  fixedCompanyId?: string;
  onSaved: () => void;
}) {
  const editing = !!contract;
  const [form, setForm] = useState<ContractInput>(blank(fixedCompanyId));
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      contract
        ? {
            company_id: contract.company_id,
            deal_id_origem: contract.deal_id_origem,
            servico: contract.servico ?? "",
            valor: contract.valor,
            recorrente: contract.recorrente,
            data_inicio: contract.data_inicio,
            data_renovacao: contract.data_renovacao,
            status: contract.status,
          }
        : blank(fixedCompanyId)
    );
    if (!fixedCompanyId) {
      listCompanies().then(setCompanies).catch(() => setCompanies([]));
    }
  }, [open, contract, fixedCompanyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_id) {
      toast.error("Selecione uma empresa");
      return;
    }
    setSaving(true);
    try {
      const payload: ContractInput = {
        ...form,
        servico: form.servico || null,
        data_inicio: form.data_inicio || null,
        data_renovacao: form.data_renovacao || null,
      };
      if (editing) await updateContract(contract!.id, payload);
      else await createContract(payload);
      toast.success(editing ? "Contrato atualizado" : "Contrato criado");
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
            {editing ? "Editar contrato" : "Novo contrato"}
          </DialogTitle>
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
            <Label htmlFor="servico">Serviço</Label>
            <Input
              id="servico"
              value={form.servico ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, servico: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as ContractStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inicio">Início</Label>
              <Input
                id="inicio"
                type="date"
                value={form.data_inicio ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, data_inicio: e.target.value || null }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="renovacao">Renovação</Label>
              <Input
                id="renovacao"
                type="date"
                value={form.data_renovacao ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    data_renovacao: e.target.value || null,
                  }))
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.recorrente}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, recorrente: v === true }))
              }
            />
            Contrato recorrente
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
