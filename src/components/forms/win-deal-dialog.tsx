"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { todayISODate } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { winDeal } from "@/services/deals";

export function WinDealDialog({
  open,
  onOpenChange,
  deal,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  onDone: () => void;
}) {
  const [servico, setServico] = useState("");
  const [valor, setValor] = useState<number | null>(null);
  const [recorrente, setRecorrente] = useState(false);
  const [dataInicio, setDataInicio] = useState(todayISODate());
  const [dataRenovacao, setDataRenovacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && deal) {
      setServico(deal.servico ?? "");
      setValor(deal.valor);
      setRecorrente(false);
      setDataInicio(todayISODate());
      setDataRenovacao("");
    }
  }, [open, deal]);

  async function handleConfirm() {
    if (!deal) return;
    setSaving(true);
    try {
      await winDeal(deal.id, {
        servico: servico || null,
        valor,
        recorrente,
        data_inicio: dataInicio || null,
        data_renovacao: dataRenovacao || null,
      });
      toast.success("Negócio ganho! Contrato criado e empresa virou cliente.");
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fechar negócio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar como ganho</DialogTitle>
          <DialogDescription>
            Será criado um contrato a partir deste negócio e a empresa passará
            para o estágio &quot;cliente&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="w-servico">Serviço</Label>
            <Input
              id="w-servico"
              value={servico}
              onChange={(e) => setServico(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="w-valor">Valor (R$)</Label>
              <Input
                id="w-valor"
                type="number"
                step="0.01"
                min="0"
                value={valor ?? ""}
                onChange={(e) =>
                  setValor(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={recorrente}
                  onCheckedChange={(v) => setRecorrente(v === true)}
                />
                Contrato recorrente
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-inicio">Início do contrato</Label>
              <Input
                id="w-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="w-renov">Renovação</Label>
              <Input
                id="w-renov"
                type="date"
                value={dataRenovacao}
                onChange={(e) => setDataRenovacao(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Fechando..." : "Confirmar ganho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
