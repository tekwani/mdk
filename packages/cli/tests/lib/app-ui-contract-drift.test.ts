import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { checkAppUi } from '../../src/lib/app-ui-check.js';
import { cleanupTmpDirs, makeTmpDir } from '../helpers.js';

// The CLI's contract check (app-ui-runner.ts) repeats the dashboard's
// (`checkAppUiModule` in @tetherto/mdk-react-adapter) because the CLI does not
// depend on the UI packages. In an MDK checkout, run the same modules through
// both: they must accept and reject exactly the same ones.
const adapterSrc = join(dirname(fileURLToPath(import.meta.url)), '../../../../ui/packages/react-adapter/src/apps');

afterEach(() => cleanupTmpDirs());

const ID = 'io.tether.demo';
const ok = `{ id: '${ID}', displayName: 'Demo', routes: [{ path: '', component: () => null }], panels: [{ id: 'p', slot: 'home', component: () => null }] }`;

// Import-free modules, so both checkers can load them as they are.
const FIXTURES: Record<string, string> = {
  valid: `export default ${ok}`,
  'no pages, no panels': `export default { id: '${ID}', displayName: 'Demo', routes: [], panels: [] }`,
  'memo-style component': `export default { id: '${ID}', displayName: 'Demo', routes: [{ path: '', component: { $$typeof: Symbol.for('react.memo') } }], panels: [] }`,
  'no default export': 'export const ui = 1',
  'default is not an object': "export default 'demo'",
  'wrong id': `export default { ...${ok}, id: 'io.tether.other' }`,
  'empty displayName': `export default { ...${ok}, displayName: '' }`,
  'routes not an array': `export default { ...${ok}, routes: {} }`,
  'route path not a string': `export default { ...${ok}, routes: [{ path: 1, component: () => null }] }`,
  'route without component': `export default { ...${ok}, routes: [{ path: '' }] }`,
  'panels not an array': `export default { ...${ok}, panels: null }`,
  'panel without id': `export default { ...${ok}, panels: [{ slot: 'home', component: () => null }] }`,
  'duplicate panel ids': `export default { ...${ok}, panels: [{ id: 'a', slot: 'home', component: () => null }, { id: 'a', slot: 'home', component: () => null }] }`,
  'panel without slot': `export default { ...${ok}, panels: [{ id: 'a', component: () => null }] }`,
  'panel component not a component': `export default { ...${ok}, panels: [{ id: 'a', slot: 'home', component: 'x' }] }`,
};

describe.runIf(existsSync(join(adapterSrc, 'load-app-ui.ts')))('UI contract: CLI vs dashboard', () => {
  it.each(Object.keys(FIXTURES))('agree on: %s', async (name) => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, 'ui'));
    const entry = join(dir, 'ui', 'index.js');
    writeFileSync(entry, `${FIXTURES[name]}\n`);

    const cliAccepts = checkAppUi(dir, { id: ID, runContract: true }).errors.length === 0;

    const { checkAppUiModule } = (await import(pathToFileURL(join(adapterSrc, 'load-app-ui.ts')).href)) as {
      checkAppUiModule: (app: { name: string; id: string }, mod: unknown) => unknown;
    };
    const mod = await import(`${pathToFileURL(entry).href}?${name.replace(/\W/g, '-')}`);
    let dashboardAccepts = true;
    try {
      checkAppUiModule({ name: 'demo', id: ID }, mod);
    } catch {
      dashboardAccepts = false;
    }

    expect({ name, cliAccepts }).toEqual({ name, cliAccepts: dashboardAccepts });
  });

  it("keeps the runner's MDK_APP_PANEL_SLOT equal to react-adapter's", async () => {
    const { MDK_APP_PANEL_SLOT } = (await import(pathToFileURL(join(adapterSrc, 'types.ts')).href)) as {
      MDK_APP_PANEL_SLOT: Record<string, string>;
    };
    expect(MDK_APP_PANEL_SLOT).toEqual({ HOME: 'home' });
  });
});
