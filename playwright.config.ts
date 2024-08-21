import { defineConfig } from 'vscode-test-playwright';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  globalSetup: path.join(__dirname, 'tests', 'global-setup.ts'),
  use: {
    trace: 'on-first-retry',
    extensionDevelopmentPath: path.join(__dirname, 'tests', 'extensions', 'vscode-extension-samples')
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
