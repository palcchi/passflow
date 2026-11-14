import fs from "node:fs";
const parse = path => {
  const out = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) out[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
};
const api = parse(".env.selfhost-postgrest");
const authPath = ".env.selfhost-auth";
const auth = parse(authPath);
auth.PASSFLOW_POSTGREST_URL = "http://127.0.0.1:3001";
auth.PASSFLOW_POSTGREST_ANON_KEY = api.PASSFLOW_POSTGREST_ANON_KEY;
auth.PASSFLOW_JWT_SECRET = api.PGRST_JWT_SECRET;
const lines = Object.entries(auth).map(([key, value]) => key + "=" + value);
fs.writeFileSync(authPath, lines.join("\n") + "\n", { mode: 0o600 });
fs.chmodSync(authPath, 0o600);
console.log("Added local PostgREST endpoint and signing config to the protected systemd env file; secrets not displayed.");
