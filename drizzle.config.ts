import { defineConfig } from 'drizzle-kit';
import fs from 'node:fs';
import path from 'node:path';

function getLocalD1DB() {
  const d1Dir = path.resolve(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (fs.existsSync(d1Dir)) {
    const files = fs.readdirSync(d1Dir).filter((f: string) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
    const firstFile = files[0];
    if (firstFile) {
      return path.join(d1Dir, firstFile);
    }
  }
  return undefined;
}

const localDbPath = getLocalD1DB();

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  ...(localDbPath ? { dbCredentials: { url: localDbPath } } : {}),
});
