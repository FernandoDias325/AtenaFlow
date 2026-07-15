/**
 * types.ts — Modelagem oficial das informações do ScriptDesk.
 *
 * Estas interfaces representam os contratos de dados entre todas as camadas
 * da aplicação (Core, UI, Import/Export). Qualquer alteração neste arquivo
 * impacta diretamente o schema do IndexedDB e os repositórios.
 *
 * Referência: ARQUITETURA.md — Seção 5 (Modelagem das Informações)
 */

// ─── Script ──────────────────────────────────────────────────────────────────

/** Representa uma versão anterior do corpo do script. */
export interface ScriptHistoryEntry {
  body: string;
  editedAt: number;
}

/** Entidade principal: um script de atendimento. */
export interface Script {
  /** Identificador único (UUID v4). */
  id: string;
  /** Assunto / título do script. */
  title: string;
  /** ID da categoria associada, ou null se sem categoria. */
  categoryId: string | null;
  /** Texto completo do script (corpo). */
  body: string;
  /** Tags de classificação livre. */
  tags: string[];
  /** Token de cor opcional para etiqueta visual. */
  colorTag?: string;
  /** Marcado como favorito pelo usuário. */
  isFavorite: boolean;
  /** Fixado no topo da lista. */
  isPinned: boolean;
  /** Contador de quantas vezes o script foi copiado. */
  usageCount: number;
  /** Observações internas do usuário sobre o script. */
  notes?: string;
  /** Timestamp de criação (epoch ms). */
  createdAt: number;
  /** Timestamp da última atualização (epoch ms). */
  updatedAt: number;
  /** Timestamp de exclusão lógica (epoch ms). null = ativo. */
  deletedAt: number | null;
  /** Histórico de versões anteriores do corpo (últimas N edições). */
  history?: ScriptHistoryEntry[];
}

// ─── Category ────────────────────────────────────────────────────────────────

/** Uma categoria para agrupar scripts. */
export interface Category {
  /** Identificador único (UUID v4). */
  id: string;
  /** Nome exibido da categoria. */
  name: string;
  /** Cor associada à categoria (token CSS ou hex). */
  color: string;
  /** Posição de ordenação na sidebar. */
  order: number;
  /** Timestamp de criação (epoch ms). */
  createdAt: number;
}

// ─── Copy History ────────────────────────────────────────────────────────────

/** Registro de uma cópia de script para a área de transferência. */
export interface CopyHistoryEntry {
  /** Identificador único do registro. */
  id: string;
  /** ID do script copiado. */
  scriptId: string;
  /** Timestamp do momento da cópia (epoch ms). */
  copiedAt: number;
}

// ─── Backup ──────────────────────────────────────────────────────────────────

/** Snapshot de backup completo armazenado dentro do IndexedDB. */
export interface BackupSnapshot {
  /** Identificador único do backup. */
  id: string;
  /** Timestamp de criação do backup (epoch ms). */
  createdAt: number;
  /** Versão do schema no momento do backup. */
  schemaVersion: number;
  /** Tamanho aproximado em bytes do JSON serializado. */
  sizeBytes: number;
  /** JSON serializado do export completo (scripts + categorias). */
  data: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

/** Configuração de backup automático. */
export interface AutoBackupConfig {
  enabled: boolean;
  frequencyHours: number;
}

/** Configurações globais da extensão (armazenadas em chrome.storage.local). */
export interface Settings {
  /** Tema visual da aplicação. */
  theme: 'light' | 'dark' | 'system';
  /** Configuração do backup automático periódico. */
  autoBackup: AutoBackupConfig;
  /** Mapeamento de atalhos de teclado personalizados. */
  shortcuts: Record<string, string>;
  /** Visualização padrão da lista de scripts. */
  defaultView: 'list' | 'grid';
  /** Versão atual do schema do banco de dados. */
  schemaVersion: number;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Número máximo de entradas no histórico de cópias. */
export const MAX_COPY_HISTORY_ENTRIES = 100;

/** Número máximo de backups internos mantidos (rotação). */
export const MAX_BACKUP_SNAPSHOTS = 7;

/** Número máximo de versões anteriores do corpo de um script. */
export const MAX_SCRIPT_HISTORY_ENTRIES = 5;

/** Versão atual do schema do banco de dados. */
export const CURRENT_SCHEMA_VERSION = 1;
