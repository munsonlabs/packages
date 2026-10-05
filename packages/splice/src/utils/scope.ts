import type { Scope, Task } from '@/types/internal'

async function drain(tasks: Task[]): Promise<void> {
  for (const task of tasks.reverse()) {
    await Promise.resolve()
      .then(task)
      .catch(() => {})
  }
}

/**
 * Runs work with a scope to hang cleanup on, so we don't need try/catch everywhere. If it fails the
 * error tasks run, tracked work settles, and it rejects with the original error, or the abort
 * reason if the signal was aborted (whatever cancelling threw is just part of the abort). An abort
 * that lands after work resolves still rejects, since nobody wants the result any more.
 */
export async function runScoped<T>(work: (scope: Scope) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const errorTasks: Task[] = []
  const alwaysTasks: Task[] = []
  const running: Promise<unknown>[] = []

  const scope: Scope = {
    onError: (task) => errorTasks.push(task),
    always: (task) => alwaysTasks.push(task),
    track: (promise) => {
      running.push(promise)
      return promise
    },
  }

  try {
    signal?.throwIfAborted()
    const value = await work(scope)
    signal?.throwIfAborted()
    return value
  } catch (error) {
    await drain(errorTasks)
    await Promise.allSettled(running)
    signal?.throwIfAborted()
    throw error
  } finally {
    await drain(alwaysTasks)
  }
}
