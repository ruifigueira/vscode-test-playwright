import { expect, test } from 'vscode-test-playwright';

test('should fail when calling disposed handle', async ({ evaluateHandleInVSCode }) => {
  const arrayHandle = await evaluateHandleInVSCode(() => [] as string[]);
  expect(await arrayHandle.evaluate(arr => arr.push('hello'))).toBe(1);
  arrayHandle.dispose();
  await expect(async () => await arrayHandle.evaluate(arr => arr.push('hello'))).rejects.toThrowError('Handle is disposed');
});

test('should free remote object from disposed handle', async ({ evaluateHandleInVSCode, evaluateInVSCode }) => {
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
