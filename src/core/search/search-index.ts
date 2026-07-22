/**
 * search-index.ts — Lógica de busca, filtro e ordenação em memória.
 *
 * Princípios:
 * - Funções puras: Recebem arrays e queries, retornam novos arrays.
 * - Performance: Normalização usa APIs nativas de alta velocidade.
 *
 * Referência: ARQUITETURA.md — Fase 3
 */

import type { Script } from '../models/types';

/**
 * Normaliza uma string para busca.
 * Converte para minúsculas e remove todos os acentos/diacríticos.
 *
 * Ex: "João" -> "joao", "ATENÇÃO" -> "atencao"
 */
export function normalizeText(text: string): string {
  if (!text) {
    return '';
  }
  return text
    .normalize('NFD') // Decompõe caracteres acentuados (ex: 'á' -> 'a' + '´')
    .replace(/[\u0300-\u036f]/g, '') // Remove os diacríticos
    .toLowerCase(); // Converte para minúsculas
}

/**
 * Ordena um array de scripts de acordo com a regra de negócio oficial:
 * 1º. Fixados (Pinned)
 * 2º. Favoritos
 * 3º. Desempate com base no `mode` ('recent' usa updatedAt, 'usage' usa usageCount)
 *
 * @param scripts Array de scripts a ser ordenado
 * @param mode Modo de ordenação do desempate final
 * @returns Um novo array ordenado
 */
export function sortScripts(scripts: Script[], mode: 'recent' | 'usage' = 'recent'): Script[] {
  // Retorna uma cópia ordenada para manter a pureza
  return [...scripts].sort((a, b) => {
    // 1. Fixados primeiro
    if (a.isPinned && !b.isPinned) {
      return -1;
    }
    if (!a.isPinned && b.isPinned) {
      return 1;
    }

    // 2. Favoritos depois (se ambos são fixados, ou ambos não são fixados)
    if (a.isFavorite && !b.isFavorite) {
      return -1;
    }
    if (!a.isFavorite && b.isFavorite) {
      return 1;
    }

    // 3. Desempate dependendo do modo
    if (mode === 'usage') {
      // Desempate de usos também olha para o updatedAt caso o usageCount seja igual
      if (b.usageCount !== a.usageCount) {
        return (b.usageCount || 0) - (a.usageCount || 0);
      }
    }

    // Fallback: data de modificação (mais recente primeiro)
    return b.updatedAt - a.updatedAt;
  });
}

/**
 * Filtra um array de scripts baseado em uma query de busca.
 * A busca procura o termo normalizado no título, no corpo ou nas notas.
 *
 * @param scripts Array de scripts
 * @param query Termo de busca digitado pelo usuário
 * @returns Array contendo apenas os scripts que dão match
 */
export function filterScripts(scripts: Script[], query: string): Script[] {
  const normalizedQuery = normalizeText(query).trim();

  // Se a busca estiver vazia, retorna todos os scripts (geralmente eles já vêm ordenados)
  if (!normalizedQuery) {
    return scripts;
  }

  return scripts.filter((script) => {
    // Normaliza os campos apenas no momento da busca.
    // Em listas muito grandes (>10k) faríamos cache da versão normalizada no próprio objeto.
    const searchString = normalizeText(`${script.title} ${script.body} ${script.notes ?? ''}`);

    return searchString.includes(normalizedQuery);
  });
}
