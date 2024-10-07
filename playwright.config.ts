import { defineConfig } from '@playwright/test';
import path from 'path';
import type { VSCodeTestOptions, VSCodeWorkerOptions } from 'vscode-test-playwright';

export default defineConfig<VSCodeTestOptions, VSCodeWorkerOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    trace: 'off',
    vscodeTrace: 'on',
    extensionDevelopmentPath: path.join(__dirname, 'tests', 'extension')
  },
  projects: [
    {
      name: 'insiders',
      use: {
        vscodeVersion: 'insiders',
      },
    },
    {
      name: 'release',
      use: {
        vscodeVersion: '1.92.2',
      },
    },
  ],
});
