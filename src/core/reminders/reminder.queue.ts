/** Cria uma fila FIFO para impedir que tarefas assíncronas alterem o mesmo estado em paralelo. */
export function createSerialTaskQueue<T>(
  handler: (value: T) => Promise<void>,
  onError?: (error: unknown) => void
): (value: T) => Promise<void> {
  let queue: Promise<void> = Promise.resolve();
  return (value: T) => {
    queue = queue
      .then(() => handler(value))
      .catch((error) => {
        onError?.(error);
      });
    return queue;
  };
}
