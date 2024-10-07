import { VSCodeTestOptions, VSCodeWorkerOptions } from 'vscode-test-playwright';
import { defineConfig } from '@playwright/test';
import * as path from 'path';

export default defineConfig<VSCodeTestOptions, VSCodeWorkerOptions>({
  testDir: path.join(__dirname, 'tests'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    // should point to extension output dir
    extensionDevelopmentPath: __dirname,
    vscodeTrace: 'on',
  },
  projects: [
    {
      name: 'insiders',
      use: { vscodeVersion: 'insiders' },
    },
  ],
});