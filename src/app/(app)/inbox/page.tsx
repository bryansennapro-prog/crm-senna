"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Loading, ErrorState } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAsync } from "@/hooks/use-async";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { ConversationListItem, Message } from "@/lib/types";
import {
  listConversations,
  markConversationRead,
} from "@/services/conversations";
import { listMessages, sendMessage } from "@/services/messages";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const {
    data: conversations,
    loading,
    error,
    refetch,
  } = useAsync<ConversationListItem[]>(() => listConversations(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const selected = conversations?.find((c) => c.id === selectedId) ?? null;
  const withinWindow =
    !!selected?.last_inbound_at &&
    Date.now() - new Date(selected.last_inbound_at).getTime() < WINDOW_MS;

  // Realtime: qualquer mudança em conversas recarrega a lista.
  useEffect(() => {
    const ch = supabase
      .channel("inbox-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, refetch]);

  // Carrega mensagens da conversa selecionada + escuta novas inserções.
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    setLoadingMsgs(true);
    listMessages(selectedId)
      .then(setMessages)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoadingMsgs(false));

    markConversationRead(selectedId).then(refetch).catch(() => {});

    const ch = supabase
      .channel(`inbox-messages-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m]
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, supabase]);

  return (
    <div>
      <PageHeader
        title="Conversas"
        description="Caixa de entrada do WhatsApp. Cada contato novo abre uma conversa e um lead."
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} />
      ) : !conversations || conversations.length === 0 ? (
        <EmptyState
          title="Nenhuma conversa ainda"
          description="As conversas aparecem aqui quando um cliente envia mensagem no WhatsApp conectado."
        />
      ) : (
        <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-lg border">
          {/* Lista */}
          <aside
            className={cn(
              "w-full flex-col border-r md:flex md:w-80",
              selectedId ? "hidden md:flex" : "flex"
            )}
          >
            <div className="flex-1 overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-2 border-b p-3 text-left hover:bg-muted/50",
                    c.id === selectedId && "bg-muted"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.contact?.nome ?? "Contato"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.contact?.telefone_whatsapp ?? c.company?.nome ?? ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {c.last_message_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(c.last_message_at)}
                      </span>
                    )}
                    {c.unread_count > 0 && (
                      <Badge variant="success" className="text-[10px]">
                        {c.unread_count}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Thread */}
          <section
            className={cn(
              "flex-1 flex-col",
              selectedId ? "flex" : "hidden md:flex"
            )}
          >
            {!selected ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                <MessageCircle className="mr-2 h-4 w-4" />
                Selecione uma conversa
              </div>
            ) : (
              <>
                <header className="flex items-center gap-2 border-b p-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedId(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {selected.contact?.nome ?? "Contato"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selected.company?.id ? (
                        <Link
                          href={`/empresas/${selected.company.id}`}
                          className="hover:underline"
                        >
                          {selected.company.nome}
                        </Link>
                      ) : (
                        selected.contact?.telefone_whatsapp ?? ""
                      )}
                    </p>
                  </div>
                </header>

                <Thread messages={messages} loading={loadingMsgs} />

                <Composer
                  conversationId={selected.id}
                  withinWindow={withinWindow}
                />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Thread({
  messages,
  loading,
}: {
  messages: Message[];
  loading: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) return <Loading />;

  return (
    <div className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
      {messages.map((m) => {
        const out = m.direction === "outbound";
        return (
          <div
            key={m.id}
            className={cn("flex", out ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                out
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border"
              )}
            >
              <p className="whitespace-pre-wrap break-words">
                {m.conteudo || `[${m.tipo}]`}
              </p>
              <div
                className={cn(
                  "mt-1 text-[10px]",
                  out ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {formatDateTime(m.timestamp)}
                {out && ` · ${m.status}`}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function Composer({
  conversationId,
  withinWindow,
}: {
  conversationId: string;
  withinWindow: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendMessage(conversationId, body);
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  if (!withinWindow) {
    return (
      <div className="border-t bg-muted/30 p-3 text-center text-xs text-muted-foreground">
        Fora da janela de 24h. Para reabrir a conversa, é necessário um
        <strong> template aprovado</strong> (gestão de templates virá em uma
        próxima fase).
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 border-t p-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Escreva uma mensagem... (Enter envia, Shift+Enter quebra linha)"
        className="min-h-[44px] flex-1 resize-none"
      />
      <Button onClick={handleSend} disabled={sending || !text.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
