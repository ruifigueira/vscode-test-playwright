import { type FullConfig } from '@playwright/test';

import { downloadAndUnzipVSCode, SilentReporter } from '@vscode/test-electron';
import type { TestOptions } from 'vscode-test-playwright';

export default async function globalSetup(config: FullConfig) {
  const versions = [...new Set(config.projects.flatMap(p => (p.use as TestOptions).vscodeVersion).filter(Boolean))];
  console.debug(`Ensure VS Code versions are installed: ${versions.join(', ')}`);
  await Promise.all(versions.map(version => downloadAndUnzipVSCode({ version, reporter: new SilentReporter() })));
}
