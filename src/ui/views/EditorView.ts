/**
 * EditorView.ts — View do editor de script.
 *
 * Carrega o script do repositório (se editando) e monta o ScriptEditor.
 *
 * Referência: ARQUITETURA.md — Seção 7 (Editor)
 */

import { createScriptEditor } from '../components/ScriptEditor';
import * as ScriptsRepo from '../../core/db/scripts.repository';

/**
 * Cria a view do editor.
 *
 * @param scriptId - ID do script a editar, ou null para criar um novo.
 * @returns O elemento raiz do EditorView.
 */
export async function createEditorView(scriptId: string | null): Promise<HTMLElement> {
  let script = null;

  if (scriptId) {
    script = (await ScriptsRepo.getScript(scriptId)) ?? null;
  }

  return createScriptEditor({ script });
}
