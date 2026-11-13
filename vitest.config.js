import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

// Testes rápidos (funções, cliente da API, componentes isolados). Os de ponta a ponta ficam em vitest.e2e.config.js.
export default defineConfig((env) => mergeConfig(viteConfig(env), defineConfig({
  test: {
    include: ['tests/unit/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      // lógica própria do backoffice (regras de apresentação, cliente da API, tema, sessão) tem cobertura total; money.js, dates.js e ui.jsx são cópias do app web (testadas lá); telas e demais componentes são exercitados pelos testes de ponta a ponta (npm run test:e2e)
      include: ['src/lib/billing.js', 'src/api/client.js', 'src/context/{ThemeContext,AuthContext}.jsx'],
      reporter: ['text'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})));
