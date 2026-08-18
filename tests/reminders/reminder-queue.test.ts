import { describe, expect, it } from 'vitest';
import { createSerialTaskQueue } from '../../src/core/reminders/reminder.queue';

describe('fila de disparo dos lembretes', () => {
  it('processa dois alarmes simultâneos integralmente e na ordem recebida', async () => {
    const events: string[] = [];
    const enqueue = createSerialTaskQueue<string>(async (id) => {
      events.push(`início-${id}`);
      await Promise.resolve();
      events.push(`fim-${id}`);
    });

    await Promise.all([enqueue('1'), enqueue('2')]);

    expect(events).toEqual(['início-1', 'fim-1', 'início-2', 'fim-2']);
  });

  it('continua processando depois de uma falha isolada', async () => {
    const completed: string[] = [];
    const enqueue = createSerialTaskQueue<string>(async (id) => {
      if (id === 'falha') {
        throw new Error('teste');
      }
      completed.push(id);
    });

    await Promise.all([enqueue('falha'), enqueue('seguinte')]);

    expect(completed).toEqual(['seguinte']);
  });
});
