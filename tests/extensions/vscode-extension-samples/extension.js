const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerCommand('example.helloWorld', () => {
			vscode.window.showInformationMessage('Hello World!');
		}),
		vscode.commands.registerCommand('example.showView', viewName => {
			const panel = vscode.window.createWebviewPanel(viewName, viewName, {}, { enableScripts: true });
			panel.webview.html = fs.readFileSync(path.join(__dirname, 'views', `${viewName}.html`), { encoding: 'utf-8' });
			context.subscriptions.push(panel);
		}),
	);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate,
};
