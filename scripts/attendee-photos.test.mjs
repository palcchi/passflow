import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

process.env.NEXT_PUBLIC_APP_URL = 'https://passflow.test';
process.env.PASSFLOW_LOCAL_DATABASE = 'true';
const source = fs.readFileSync(new URL('../lib/attendee-photos.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
}).outputText;
const mod = { exports: {} };
const fakeRequire = (name) => {
  if (name === '@/lib/supabase/config') return { getAppOrigin: () => 'https://passflow.test' };
  throw new Error('unexpected_import:' + name);
};
vm.runInNewContext(code, { require: fakeRequire, exports: mod.exports, module: mod, process, URL });
const { safeAvatarUrl } = mod.exports;

assert.equal(safeAvatarUrl('https://passflow.test/api/local-files/profile-avatars/u/a.png'), 'https://passflow.test/api/local-files/profile-avatars/u/a.png');
assert.equal(safeAvatarUrl('https://lh3.googleusercontent.com/a/x'), 'https://lh3.googleusercontent.com/a/x');
assert.equal(safeAvatarUrl('https://proj.supabase.co/storage/v1/object/public/profile-avatars/u/a.png'), null);
assert.equal(safeAvatarUrl('https://proj.supabase.co.evil.com/storage/v1/object/public/profile-avatars/x'), null);
assert.equal(safeAvatarUrl('https://tracker.example/pixel.png'), null);
assert.equal(safeAvatarUrl(null), null);
console.log('attendee photo url checks passed');
