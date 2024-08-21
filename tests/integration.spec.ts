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
