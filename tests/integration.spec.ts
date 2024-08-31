import { expect, test } from 'vscode-test-playwright';

test('should execute command', async ({ workbox, evaluateInVSCode }) => {
  await evaluateInVSCode(vscode => vscode.commands.executeCommand('example.helloWorld'));

  const toast = workbox.locator('.notification-toast', { hasNot: workbox.getByRole('button', { name: 'Install' }) });
  await expect(toast.locator('.notification-list-item-icon')).toHaveClass(/codicon-info/);
  await expect(toast.locator('.notification-list-item-message')).toContainText('Hello World!');
});

test('should drag and drop in webview', async ({ evaluateInVSCode, workbox }) => {
  await evaluateInVSCode(vscode => vscode.commands.executeCommand('example.showView', 'drag'));

  const webview = workbox.locator('iframe').contentFrame().locator('iframe').contentFrame();
  await expect(webview.locator('#droppable')).not.toHaveText("Drag into rectangle");
  await webview.locator('#draggable').dragTo(webview.locator('#droppable'));
  await expect(webview.locator('#droppable')).toHaveText("Drag into rectangle");
});

test('ensure editor is open', async ({ evaluateInVSCode }) => {
  const openUris = await evaluateInVSCode(async (vscode, path) => {
    await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(path));
    return vscode.window.visibleTextEditors.map(e => e.document.uri.toString());
  }, 'untitled:/empty.txt');
  expect(openUris).toEqual(['untitled:/empty.txt']);
});

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
