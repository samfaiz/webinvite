#!/usr/bin/env node
/**
 * invite — read and change invitations through the agent API (/api/agent).
 *
 * The key comes from AGENT_API_KEY, or the file .agent-key at the repo root
 * (git-ignored). It is only ever sent as a header, never printed.
 * The server is INVITE_API (default https://webinvite.co/api).
 *
 *   node tools/invite.mjs list [search]
 *   node tools/invite.mjs get <slug|id> [path]            e.g. content.schedule.events
 *   node tools/invite.mjs set <ref> <path> <value> [--dry] [--note "…"]
 *   node tools/invite.mjs unset <ref> <path> [--dry]
 *   node tools/invite.mjs push <ref> <path> <value> [--dry]
 *   node tools/invite.mjs insert <ref> <path.N> <value> [--dry]
 *   node tools/invite.mjs merge <ref> <path> <json> [--dry]
 *   node tools/invite.mjs ops <ref> <ops.json> [--dry] [--note "…"]
 *   node tools/invite.mjs replace <ref> <parts.json> [--dry]
 *   node tools/invite.mjs create <draft.json>
 *   node tools/invite.mjs publish|unpublish <ref>
 *   node tools/invite.mjs delete <ref> --confirm <slug>
 *   node tools/invite.mjs revisions <ref>
 *   node tools/invite.mjs restore <revisionId>
 *
 * A <value> that parses as JSON is sent as JSON ({"a":1}, 12, true, "text"),
 * anything else as plain text. Paths start at content, theme, templateId,
 * themeId, motifId or ownerEmail; numbers are list positions.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.env.INVITE_API || "https://webinvite.co/api").replace(/\/+$/, "");

function key() {
  const fromEnv = process.env.AGENT_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const file = join(root, ".agent-key");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  fail("No agent key: set AGENT_API_KEY or put it in .agent-key at the repo root.");
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function call(method, path, body) {
  const res = await fetch(`${API}/agent${path}`, {
    method,
    headers: { "x-agent-key": key(), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) fail(`${res.status} ${typeof data === "object" ? data.message ?? JSON.stringify(data) : data}`);
  return data;
}

const value = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};
const at = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
const show = (x) => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));

// flags: --dry, --note "…", --confirm <slug>
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  argv.splice(i, v && !v.startsWith("--") ? 2 : 1);
  return v && !v.startsWith("--") ? v : true;
};
const dryRun = !!flag("--dry");
const note = flag("--note");
const confirm = flag("--confirm");
const [cmd, ref, a, b] = argv;
const enc = encodeURIComponent;

/** The outcome of an edit, kept short: what changed, and the undo point. */
function summarise(out) {
  const lines = [];
  if (out.dryRun) lines.push("DRY RUN: nothing saved");
  if (out.touched) lines.push(...out.touched.map((t) => `  ${t}`));
  if (out.replaced) lines.push(`  replaced ${out.replaced.join(", ")}`);
  if (out.revision) lines.push(`undo with: restore ${out.revision}`);
  lines.push(`→ ${out.result?.slug ? `/i/${out.result.slug}` : out.result?.id} (${out.result?.status})`);
  console.log(lines.join("\n"));
}

const patch = async (op, path, v) => {
  const o = { op, path };
  if (v !== undefined) o.value = v;
  summarise(await call("PATCH", `/invitations/${enc(ref)}`, { ops: [o], note, dryRun }));
};

switch (cmd) {
  case "list": {
    const rows = await call("GET", `/invitations${ref ? `?q=${enc(ref)}` : ""}`);
    for (const r of rows) console.log(`${(r.slug ?? "(draft)").padEnd(28)} ${r.status.padEnd(9)} ${r.templateId.padEnd(18)} ${r.names}  · ${r.rsvps} RSVPs  · ${r.id}`);
    break;
  }
  case "get": {
    if (!ref) fail("get <slug|id> [path]");
    const inv = await call("GET", `/invitations/${enc(ref)}`);
    show(a ? at(inv, a) : inv);
    break;
  }
  case "set":
  case "push":
  case "insert":
  case "merge":
    if (!ref || !a || b === undefined) fail(`${cmd} <ref> <path> <value>`);
    await patch(cmd, a, value(b));
    break;
  case "unset":
    if (!ref || !a) fail("unset <ref> <path>");
    await patch("unset", a);
    break;
  case "ops": {
    if (!ref || !a) fail("ops <ref> <ops.json>");
    const ops = JSON.parse(readFileSync(a, "utf8"));
    summarise(await call("PATCH", `/invitations/${enc(ref)}`, { ops: Array.isArray(ops) ? ops : ops.ops, note, dryRun }));
    break;
  }
  case "replace": {
    if (!ref || !a) fail("replace <ref> <parts.json>");
    summarise(await call("PUT", `/invitations/${enc(ref)}`, { ...JSON.parse(readFileSync(a, "utf8")), note, dryRun }));
    break;
  }
  case "create": {
    if (!ref) fail("create <draft.json>");
    const out = await call("POST", "/invitations", JSON.parse(readFileSync(ref, "utf8")));
    console.log(`created draft ${out.id} (${out.templateId}); publish with: publish ${out.id}`);
    break;
  }
  case "publish":
  case "unpublish": {
    if (!ref) fail(`${cmd} <ref>`);
    const out = await call("POST", `/invitations/${enc(ref)}/${cmd}`);
    console.log(`${cmd}ed → ${out.slug ? `/i/${out.slug}` : out.id} (${out.status})`);
    break;
  }
  case "delete": {
    if (!ref) fail("delete <ref> --confirm <slug>");
    const out = await call("DELETE", `/invitations/${enc(ref)}?confirm=${enc(confirm === true ? "" : confirm ?? "")}`);
    console.log(`deleted ${out.deleted} (${out.rsvps} RSVPs kept in the copy); undo with: restore ${out.revision}`);
    break;
  }
  case "revisions": {
    if (!ref) fail("revisions <ref>");
    for (const r of await call("GET", `/invitations/${enc(ref)}/revisions`)) {
      console.log(`${r.id}  ${new Date(r.createdAt).toLocaleString()}  ${r.action.padEnd(9)} ${r.note ?? ""}`);
    }
    break;
  }
  case "restore": {
    if (!ref) fail("restore <revisionId>");
    const out = await call("POST", `/revisions/${enc(ref)}/restore`);
    console.log(`restored → ${out.slug ? `/i/${out.slug}` : out.id} (${out.status})`);
    break;
  }
  default:
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^#!.*\n\/\*\*?/, "").replace(/^ \* ?/gm, ""));
}
