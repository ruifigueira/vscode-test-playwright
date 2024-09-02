# VS Code Tests for Playwright

This module allows running VS Code extension tests with [playwright](https://github.com/microsoft/playwright/).
It allows both VS Code API and UI to be tested simultaneously by combining:

- [@vscode/test-electron](https://code.visualstudio.com/api/working-with-extensions/testing-extension#advanced-setup-your-own-runner) with a custom runner that exposes a server that allows evaluating code inside VS Code
- [@playwright/test](https://playwright.dev/docs/writing-tests) that launches VSCode electron app and allows interactions with VS Code UI using VSCode, as well as evaluating functions in VS Code context

> [!NOTE]
> Not to be confused with [Playwright Test for VS Code](https://github.com/microsoft/playwright-vscode).

## Quick Start

- Install `playwright@latest` and `vscode-test-playwright`

```bash
npm install --save-dev playwright@latest vscode-test-playwright@latest
```

- edit `playwright.config.ts`:

```ts
import type { VSCodeTestOptions, VSCodeWorkerOptions } from 'vscode-test-playwright';
import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig<VSCodeTestOptions, VSCodeWorkerOptions>({
  testDir: path.join(__dirname, 'tests'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    // should point to extension output dir
    extensionDevelopmentPath: path.join(__dirname, 'extension'),
    vscodeTrace: 'on',
  },
  projects: [
    {
      name: 'insiders',
      use: { vscodeVersion: 'insiders' },
    },
    {
      name: '1.91.0',
      use: { vscodeVersion: '1.91.0' },
    },
  ],
});
```

- create a test file `tests/basic.spec.ts`:

```ts
import { expect, test } from 'vscode-test-playwright';

test('should show a message', async ({ workbox, evaluateInVSCode }) => {
  await evaluateInVSCode(vscode => {
    vscode.window.showInformationMessage('Hello, World!');
  });

  const toast = workbox.locator('.notification-toast', { hasNot: workbox.getByRole('button', { name: 'Install' }) });
  await expect(toast.locator('.notification-list-item-icon')).toHaveClass(/codicon-info/);
  await expect(toast.locator('.notification-list-item-message')).toContainText('Hello, World!');
});
```
- run it:

```bash
npx playwright test
```

Generated report will include playwright traces from VS Code, which can be very helpful to identify issues of locators for UI elements.

## API

The following [fixtures](https://playwright.dev/docs/test-fixtures#creating-a-fixture) are available:

### `evaluateInVSCode`

Receives and evaluates a function in the context of VS Code. It has access to `vscode`, as in `import * as vscode from 'vscode';`.
So, for instance, it's possible to execute a command:

```ts
test('execute command', async ({ evaluateInVSCode }) => {
  await evaluateInVSCode(vscode => vscode.commands.executeCommand('vscode.open', Uri.file('/some/path/to/folder')));
});
```

It's also possible to pass a [serializable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description) or handle argument, and return a serializable value, either as a promise or not:

```ts
test('ensure editor is open', async ({ evaluateInVSCode }) => {
  const openUris = await evaluateInVSCode(async (vscode, path) => {
    await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(path));
    return vscode.window.visibleTextEditors.map(e => e.document.uri.toString());
  }, 'untitled:/empty.txt');
  expect(openUris).toEqual(['untitled:/empty.txt']);
});
```

### `evaluateHandleInVSCode`

Similar to `evaluateInVSCode` but can return a reference to a complex VS Code object, so that future interactions can be made with the ssme object.

It's the equivalent of playwright's [evaluateHandle](https://playwright.dev/docs/api/class-page#page-evaluate-handle), but instead of representing object in a browser page, it represents objects in VS Code context.

For instance, here's an example where we get as editor handle and then write text into it:

```ts
test('write text into new document', async ({ evaluateHandleInVSCode, evaluateInVSCode }) => {
  const editorHandle = await evaluateHandleInVSCode(async (vscode, path) => {
		return await vscode.window.showTextDocument(vscode.Uri.parse(path));
  }, 'untitled:/hello.txt');

  await evaluateInVSCode(async (vscode, editor) => {
    await editor.edit(edit => edit.insert(new vscode.Position(0, 0), 'Hello, World!'));
  }, editorHandle);

  const text = await editorHandle.evaluate(editor => editor.document.getText());

  expect(text).toBe(`Hello, World!`);
});
```

Notice that we can use `evaluate` function on a handle directly:

```ts
await editorHandle.evaluate(editor => editor.document.getText())`
```

All handles obtained with `evaluateHandleInVSCode` are released after each test.
Nevertheless, it's possible to release an handle explicitly with:

```ts
await editorHandle.release();
```

This ensures the reference is released on VS Code side, so that VS Code can eventually clean its resources.
Future evaluations using a released handle will fail.

For disposable handles, it's also possible to dispose on release:

```ts
await disposableHandle.release({ dispose: true });
```

> [!NOTE]
> Implicit handle release after each test won't dispose its references, so release with dispose must be explicit.

### `EventEmitter` handles

An `EventEmitter` handle allows adding and removing local listeners that are triggered by remote events.
Events should be [serializable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description), so it's better to wrap built-in VS Code events before returning them.

An example:

```ts
test('listen to document changes', async ({ evaluateHandleInVSCode, evaluateInVSCode }) => {
  const editorHandle = await evaluateHandleInVSCode(async (vscode, path) => {
		return await vscode.window.showTextDocument(vscode.Uri.parse(path));
  }, 'untitled:/hello.txt');

  const documentChangedHandle = await evaluateHandleInVSCode(async vscode => {
    const documentChanged = new vscode.EventEmitter<string>();
    vscode.workspace.onDidChangeTextDocument(e => documentChanged.fire(e.document.getText()));
    return documentChanged;
  });

  const documentChanges: string[] = [];
  await documentChangedHandle.addListener(change => {
    documentChanges.push(change);
  });

  await evaluateInVSCode(async (vscode, editor) => {
    await editor.edit(edit => edit.insert(new vscode.Position(0, 0), 'Hello, World!'));
  }, editorHandle);

  await expect.poll(() => documentChanges).toEqual([
    'Hello, World!',
  ]);
});

```
