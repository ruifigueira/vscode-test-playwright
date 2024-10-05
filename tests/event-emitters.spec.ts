import { expect, test } from 'vscode-test-playwright';

test('should receive vscode events', async ({ evaluateHandleInVSCode }) => {
  const emitterHandle = await evaluateHandleInVSCode(vscode => new vscode.EventEmitter<string>());
  let result: string | undefined;
  await emitterHandle.addListener(value => {
    result = value;
  });
  await emitterHandle.evaluate(emitter => emitter.fire('hello'));
  await expect.poll(() => result).toBe('hello');
});

test('should handle multiple listeners', async ({ evaluateHandleInVSCode }) => {
  const emitterHandle = await evaluateHandleInVSCode(vscode => new vscode.EventEmitter<void>());
  let result: string[] = [];
  await emitterHandle.addListener(() => result.push(`hello`));
  await emitterHandle.addListener(() => result.push(`bye`));
  await emitterHandle.evaluate(emitter => emitter.fire());
  await expect.poll(() => result).toEqual(['hello', 'bye']);
});

test('should remove listener', async ({ evaluateHandleInVSCode }) => {
  const emitterHandle = await evaluateHandleInVSCode(vscode => new vscode.EventEmitter<void>());
  let count = 0;
  const listener = () => {
    count++;
  };
  await emitterHandle.addListener(listener);
  await emitterHandle.evaluate(emitter => emitter.fire());
  expect(count).toBe(1);
  await emitterHandle.evaluate(emitter => emitter.fire());
  expect(count).toBe(2);
  await emitterHandle.removeListener(listener);
  await emitterHandle.evaluate(emitter => emitter.fire());
  expect(count).not.toBe(3);
});

test('should trigger active listeners when one is removed', async ({ evaluateHandleInVSCode }) => {
  const emitterHandle = await evaluateHandleInVSCode(vscode => new vscode.EventEmitter<void>());
  let result: string[] = [];
  const helloListener = () => result.push(`hello`);
  const byeListener = () => result.push(`bye`);
  await emitterHandle.addListener(helloListener);
  await emitterHandle.addListener(byeListener);
  await emitterHandle.evaluate(emitter => emitter.fire());
  await emitterHandle.removeListener(byeListener);
  await emitterHandle.evaluate(emitter => emitter.fire());
  await expect.poll(() => result).toEqual(['hello', 'bye', 'hello']);
});
