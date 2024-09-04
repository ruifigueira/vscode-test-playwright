import { expect, test } from 'vscode-test-playwright';
import type { Disposable } from 'vscode';

test('should fail when calling released handle', async ({ evaluateHandleInVSCode }) => {
  const arrayHandle = await evaluateHandleInVSCode(() => [] as string[]);
  expect(await arrayHandle.evaluate(arr => arr.push('hello'))).toBe(1);
  await arrayHandle.release();
  await expect(async () => await arrayHandle.evaluate(arr => arr.push('hello'))).rejects.toThrowError('Handle is released');
});

test('should free remote object from released handle', async ({ evaluateHandleInVSCode, evaluateInVSCode }) => {
  const arrayHandle = await evaluateHandleInVSCode(() => [] as string[]);
  // @ts-expect-error
  const refHandle = await evaluateHandleInVSCode((_, arr) => new WeakRef(arr), arrayHandle);

  expect(await refHandle.evaluate(ref => ref.deref())).toEqual([]);
  await arrayHandle.release();

  // call garbage collector
  await evaluateInVSCode(async () => {
    // https://stackoverflow.com/a/75007985
    (await import('v8')).setFlagsFromString('--expose_gc');
    const gc = (await import('vm')).runInNewContext('gc');
    gc();
  });

  await expect.poll(() => refHandle.evaluate(ref => ref.deref())).toBeUndefined();
});

test('should release and not dispose handle for disposable', async ({ evaluateHandleInVSCode }) => {
  const disposedHandle = await evaluateHandleInVSCode(() => [] as Disposable[]);
  const disposableHandle = await evaluateHandleInVSCode((_, disposed) => {
    const disposable: Disposable = {
      dispose() {
        disposed.push(disposable);
      }
    };
  }, disposedHandle);
  await disposableHandle.release();
  expect(await disposedHandle.evaluate(d => d.length)).toBe(0);
});

test('should release and dispose handle for disposable', async ({ evaluateHandleInVSCode }) => {
  const disposedHandle = await evaluateHandleInVSCode(() => [] as Disposable[]);
  const disposableHandle = await evaluateHandleInVSCode((_, disposed) => {
    const disposable: Disposable = {
      dispose() {
        disposed.push(disposable);
      }
    };
    return disposable;
  }, disposedHandle);
  await disposableHandle.release({ dispose: true });
  expect(await disposedHandle.evaluate(d => d.length)).toBe(1);
});

test('should throw', async ({ evaluateInVSCode, evaluateHandleInVSCode }) => {
  await expect.soft(evaluateInVSCode(() => {
    throw new Error('oops');
  })).rejects.toThrowError('oops');

  await expect.soft(evaluateHandleInVSCode(() => {
    throw new Error('oops handle');
  })).rejects.toThrowError('oops handle');
});
