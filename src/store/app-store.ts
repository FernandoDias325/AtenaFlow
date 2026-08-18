/**
 * app-store.ts — Sistema Pub/Sub reativo para o estado global da UI.
 *
 * Implementa um barramento de eventos tipado e simples, sem dependências
 * externas. Componentes se inscrevem em eventos e são notificados quando
 * o estado muda, garantindo reatividade sem framework.
 *
 * Princípios:
 *  - SRP: Responsável exclusivamente pelo gerenciamento de estado e eventos.
 *  - OCP: Novos eventos podem ser adicionados ao mapa de tipos sem modificar o core.
 *
 * Referência: ARQUITETURA.md — Seção 1.2 (pub-sub simples escrito à mão)
 */

import type { Script } from '../core/models/types';

// ─── Tipos de Eventos ───────────────────────────────────────────────────────

/** Mapa tipado de eventos da aplicação e seus payloads. */
export interface AppEventMap {
  /** Lista de scripts ativos foi atualizada. */
  'scripts-changed': Script[];
  /** Lista de categorias foi atualizada. */
  'categories-changed': void;
  /** Transição de view solicitada. */
  'view-changed': ViewState;
  /** Exibir notificação toast. */
  toast: ToastPayload;
}

export type ViewState =
  | { view: 'list' }
  | { view: 'categories' }
  | { view: 'settings' }
  | { view: 'trash' }
  | { view: 'dashboard' }
  | { view: 'links' }
  | { view: 'notepad' }
  | { view: 'manual' }
  | { view: 'release-notes' }
  | { view: 'reminders' }
  | { view: 'editor'; scriptId: string | null };

/** Payload para notificações toast. */
export interface ToastPayload {
  message: string;
  type: 'success' | 'error' | 'info';
  durationMs?: number;
}

// ─── Tipos internos ─────────────────────────────────────────────────────────

type EventHandler<T> = (payload: T) => void;

interface Subscription {
  unsubscribe: () => void;
}

// ─── Implementação do Store ──────────────────────────────────────────────────

/** Mapa de listeners por evento. */
const listeners = new Map<string, Set<EventHandler<unknown>>>();

/**
 * Inscreve um handler para um evento específico.
 *
 * @param event - Nome do evento (tipado).
 * @param handler - Função chamada quando o evento é emitido.
 * @returns Objeto com método `unsubscribe()` para cancelar a inscrição.
 *
 * @example
 * ```ts
 * const sub = subscribe('scripts-changed', (scripts) => {
 *   renderList(scripts);
 * });
 *
 * // Para cancelar:
 * sub.unsubscribe();
 * ```
 */
export function subscribe<K extends keyof AppEventMap>(
  event: K,
  handler: EventHandler<AppEventMap[K]>
): Subscription {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }

  const handlerSet = listeners.get(event)!;
  handlerSet.add(handler as EventHandler<unknown>);

  return {
    unsubscribe: () => {
      handlerSet.delete(handler as EventHandler<unknown>);
      // Limpa o Set se ficou vazio para não acumular memória
      if (handlerSet.size === 0) {
        listeners.delete(event);
      }
    }
  };
}

/**
 * Emite um evento, notificando todos os handlers inscritos.
 *
 * @param event - Nome do evento.
 * @param payload - Dados associados ao evento.
 */
export function emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
  const handlerSet = listeners.get(event);
  if (!handlerSet) {
    return;
  }

  // Itera sobre uma cópia do Set para evitar problemas se um handler
  // se desinscrever durante a iteração
  for (const handler of [...handlerSet]) {
    try {
      handler(payload);
    } catch (error) {
      console.error(`[AppStore] Erro no handler do evento "${event}":`, error);
    }
  }
}

/**
 * Remove TODOS os listeners de TODOS os eventos.
 * Útil para teardown completo da aplicação ou em testes.
 */
export function clearAllListeners(): void {
  listeners.clear();
}

/**
 * Retorna o número de listeners registrados para um evento (para debug/testes).
 */
export function listenerCount<K extends keyof AppEventMap>(event: K): number {
  return listeners.get(event)?.size ?? 0;
}
