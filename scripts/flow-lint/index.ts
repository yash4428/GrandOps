// flow-lint. Checks .gitlab/duo/flows/*.yaml against the custom-flow rules in CLAUDE.md §7.
// Deterministic; catches the mistakes that crash sessions (stray Jinja braces, missing stop rule...).
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";

interface Prompt { prompt_id: string; unit_primitives?: unknown; model?: unknown; prompt_template: { system: string; user: string; placeholder?: string }; params?: Record<string, unknown> }
interface Component { name: string; type: string; description?: string; prompt_id?: string; inputs?: { from: string; as: string }[]; toolset?: string[]; ui_log_events?: string[]; subagents?: { name: string }[]; max_delegations?: number; response_schema_id?: unknown }
interface Flow { version: string; environment: string; components: Component[]; prompts: Prompt[]; routers: { from: string; to?: string; condition?: { input?: string; routes?: Record<string, string> } }[]; flow: { entry_point: string } }

const GITLAB_TOOLS = /^(get_|list_|create_|update_|gitlab_|submit_|dismiss_|confirm_|link_|build_review|ci_linter)/;

export function lintFlow(file: string, text: string): string[] {
  const errs: string[] = [];
  const d = parse(text) as Flow & Record<string, unknown>;
  for (const k of ["name", "description", "product_group"]) if (k in d) errs.push(`top-level "${k}" is not allowed`);
  if (d.version !== "v1") errs.push('version must be "v1"');
  if (d.environment !== "ambient") errs.push('environment must be "ambient"');
  const prompts = new Map(d.prompts.map((p) => [p.prompt_id, p]));
  const names = new Set(d.components.map((c) => c.name));
  for (const c of d.components) {
    if (/[:.]/.test(c.name)) errs.push(`${c.name}: no ":" or "." in component names`);
    if (c.response_schema_id) errs.push(`${c.name}: response_schema_id not allowed`);
    if (c.type === "HumanInputComponent") errs.push(`${c.name}: no HumanInputComponent in the hands-off path`);
    if (!c.ui_log_events?.includes("on_agent_final_answer")) errs.push(`${c.name}: set ui_log_events`);
    if (c.subagents) {
      if (!c.max_delegations) errs.push(`${c.name}: supervisor needs max_delegations`);
      // Schema: each entry is only a name; the sub-agent is its own top-level AgentComponent with a description.
      for (const s of c.subagents) {
        if (Object.keys(s).some((k) => k !== "name")) errs.push(`${c.name}/${s.name}: subagents entries take only name`);
        const target = d.components.find((x) => x.name === s.name);
        if (!target || target.type !== "AgentComponent") errs.push(`${c.name}/${s.name}: sub-agent must be a top-level AgentComponent`);
        else if (!target.description) errs.push(`${c.name}/${s.name}: sub-agent needs description`);
      }
    }
    const aliases = new Set((c.inputs ?? []).map((i) => i.as));
    const usesGitlab = (c.toolset ?? []).some((t) => GITLAB_TOOLS.test(t));
    // Schema: OneOffComponent takes no model_size_preference and only these ui_log_events.
    if (c.type === "OneOffComponent") {
      const raw = c as unknown as Record<string, unknown>;
      if ("model_size_preference" in raw) errs.push(`${c.name}: model_size_preference not allowed on OneOffComponent`);
      for (const e of (raw.ui_log_events as string[] | undefined) ?? []) if (!["on_tool_call_input", "on_tool_execution_success", "on_tool_execution_failed"].includes(e)) errs.push(`${c.name}: ui_log_event ${e} not allowed on OneOffComponent`);
    }
    if (usesGitlab && !(c.inputs ?? []).some((i) => i.from === "context:project_id" && i.as === "project_id")) errs.push(`${c.name}: GitLab tools need context:project_id as project_id`);
    for (const pid of [c.prompt_id].filter(Boolean) as string[]) {
      const p = prompts.get(pid);
      if (!p) {
        errs.push(`${c.name}: prompt ${pid} missing`);
        continue;
      }
      if (!Array.isArray(p.unit_primitives) || p.unit_primitives.length) errs.push(`${pid}: unit_primitives: [] required`);
      if (p.model) errs.push(`${pid}: model not allowed`);
      if (p.params && "stop" in p.params) errs.push(`${pid}: stop not allowed in params`);
      if (p.prompt_template.placeholder !== "history") errs.push(`${pid}: placeholder: history required`);
      if (/\{\{|\{%|\{#/.test(p.prompt_template.system)) errs.push(`${pid}: Jinja braces in system prompt`);
      // GitLab rejects prompts with HTML comments, markdown link comments or hidden unicode (SecurityException on save).
      for (const part of [p.prompt_template.system, p.prompt_template.user]) {
        if (/<!--|\[(?:\/\/|comment)\]:/.test(part)) errs.push(`${pid}: HTML/markdown comment in prompt`);
        if (/[\u200B-\u200F\u2028-\u202E\u2060-\u2064\uFEFF\u00AD]/.test(part)) errs.push(`${pid}: hidden unicode in prompt`);
      }
      if (!/final\s+answer\s+is[\s\S]*No further steps are needed after that\./.test(p.prompt_template.system)) errs.push(`${pid}: system prompt must end with an explicit stop instruction`);
      if (pid === c.prompt_id) {
        for (const v of p.prompt_template.user.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) if (!aliases.has(v[1]!)) errs.push(`${pid}: {{ ${v[1]} }} has no matching input alias`);
        if (usesGitlab && !/Project ID: \{\{ project_id \}\}/.test(p.prompt_template.user)) errs.push(`${pid}: user block needs "Project ID: {{ project_id }}"`);
      }
    }
  }
  for (const r of d.routers) {
    if (!names.has(r.from)) errs.push(`router from unknown ${r.from}`);
    if (r.to && r.to !== "end" && r.to !== "abort" && !names.has(r.to)) errs.push(`router to unknown ${r.to}`);
    if ("default_route" in r) errs.push(`router from ${r.from}: default_route goes inside condition.routes, not on the router`);
    if (r.condition && !r.condition.routes?.default_route) errs.push(`conditional router from ${r.from} needs condition.routes.default_route`);
  }
  if (!names.has(d.flow.entry_point)) errs.push("entry_point is not a component");
  return errs.map((e) => `${file}: ${e}`);
}

if (process.argv[1]?.includes("flow-lint")) {
  const dir = ".gitlab/duo/flows";
  const errs = readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .flatMap((f) => lintFlow(f, readFileSync(`${dir}/${f}`, "utf8")));
  for (const e of errs) console.error(`❌ ${e}`);
  if (errs.length) process.exit(1);
  console.log(`✅ flow-lint: ${readdirSync(dir).length} flows follow the custom-flow rules`);
}
