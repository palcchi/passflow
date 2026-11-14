import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('lib/supabase/config.ts', 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const mod = { exports: {} };
vm.runInNewContext(code, { module: mod, exports: mod.exports, process, URL });

const original = {
  localAuth: process.env.PASSFLOW_LOCAL_AUTH,
  localDb: process.env.PASSFLOW_LOCAL_DATABASE,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
try {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://legacy-project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  process.env.PASSFLOW_LOCAL_AUTH = 'true';
  process.env.PASSFLOW_LOCAL_DATABASE = 'true';
  assert.equal(mod.exports.getSupabaseConfig(), null, 'self-hosted mode must never resolve cloud config');
  process.env.PASSFLOW_LOCAL_AUTH = 'false';
  assert.equal(mod.exports.getSupabaseConfig(), null, 'local database mode must never resolve cloud config');
  process.env.PASSFLOW_LOCAL_DATABASE = 'false';
  assert.equal(mod.exports.getSupabaseConfig().url, 'https://legacy-project.supabase.co', 'legacy config remains available only outside self-hosted mode');
} finally {
  for (const [key, value] of Object.entries({
    PASSFLOW_LOCAL_AUTH: original.localAuth,
    PASSFLOW_LOCAL_DATABASE: original.localDb,
    NEXT_PUBLIC_SUPABASE_URL: original.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: original.key,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
console.log('self-hosted Supabase cloud-fallback guard checks passed');
