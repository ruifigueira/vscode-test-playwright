import path from 'path';
import fs from 'fs';
import { expect, test } from 'vscode-test-playwright';

test('paw draw!', async ({ workbox, evaluateInVSCode, baseDir }) => {
  const file = path.join(__dirname, '..', 'exampleFiles', 'example.pawDraw');
  const targetFile = path.join(baseDir, 'example.pawDraw');
  await fs.promises.copyFile(file, targetFile);
  
  await evaluateInVSCode(async (vscode) => {
    const [workspaceFolder] = vscode.workspace.workspaceFolders!;
    const targetFile = vscode.Uri.joinPath(workspaceFolder.uri, 'example.pawDraw');
    await vscode.commands.executeCommand('vscode.open', targetFile);
  });

  const editorFrame = workbox.locator('iframe').contentFrame().locator('iframe').contentFrame();
  const colorPaw = editorFrame.getByRole('button', { name: 'Red' });
  const canvas = editorFrame.locator('canvas').last();

  await expect(canvas).toBeVisible();
  
  const canvasBox = (await canvas.boundingBox())!;
  
  const points = [
    [0.4557, 0.1307], [0.3999, 0.0848], [0.3345, 0.0550], [0.2611, 0.0443], [0.2085, 0.0494], [0.1599, 0.0640],
    [0.1163, 0.0872], [0.0787, 0.1179], [0.0479, 0.1556], [0.0247, 0.1992], [0.0102, 0.2478], [0.0050, 0.3004],
    [0.0124, 0.3959], [0.0344, 0.4750], [0.0717, 0.5440], [0.1246, 0.6088], [0.2788, 0.7507], [0.5002, 0.9492],
    [0.7216, 0.7507], [0.8758, 0.6088], [0.9287, 0.5440], [0.9660, 0.4750], [0.9880, 0.3959], [0.9954, 0.3004],
    [0.9902, 0.2478], [0.9757, 0.1992], [0.9525, 0.1556], [0.9217, 0.1179], [0.8841, 0.0872], [0.8405, 0.0640],
    [0.7919, 0.0494], [0.7392, 0.0443], [0.6659, 0.0550], [0.6005, 0.0848], [0.5447, 0.1307], [0.5002, 0.1894],    
  ];

  const scaleFactor = Math.min(canvasBox.width, canvasBox.height);
  const [xTranslate, yTranslate] = [canvasBox.x + (canvasBox.width - scaleFactor) / 2, canvasBox.y + (canvasBox.height - scaleFactor) / 2];

  const [start, ...restPoints] = points.map(([x, y]) => [x * scaleFactor + xTranslate, y * scaleFactor + yTranslate]);

  await colorPaw.click();
  await workbox.mouse.move(start[0], start[1]);
  await workbox.mouse.down();
  for (const [x, y] of [start, ...restPoints, start])
    await workbox.mouse.move(x, y);
  await workbox.mouse.up();

  await expect(canvas).toHaveScreenshot();
});