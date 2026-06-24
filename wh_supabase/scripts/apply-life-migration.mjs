#!/usr/bin/env node
/**
 * Guarded one-time LifeFlow migration.
 *
 * This script uses the Supabase service role from local env files, never a user
 * password. It only targets the account resolved from the requested email and
 * refuses to mutate unless --confirm=APPLY_LIFEFLOW_MIGRATION is passed.
 */
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "..", "supabase", ".env") });
loadEnv({ path: join(__dirname, "..", ".env") });
loadEnv({ path: join(__dirname, "..", "..", "wh_frontend", ".env") });

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--") && arg.includes("="))
    .map((arg) => {
      const [key, ...rest] = arg.slice(2).split("=");
      return [key, rest.join("=")];
    })
);

const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith("--") && !arg.includes("=")).map((arg) => arg.slice(2)));
const targetEmail = args.get("email") ?? "cherkaniaymen1@gmail.com";
const confirmed = args.get("confirm") === "APPLY_LIFEFLOW_MIGRATION";
const force = flags.has("force");

if (!confirmed) {
  console.error("Refusing to mutate data. Re-run with --confirm=APPLY_LIFEFLOW_MIGRATION after reviewing the preview report.");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

function keywordPhaseType(text) {
  const value = text.toLowerCase();
  if (value.includes("school")) return "school";
  if (value.includes("study") || value.includes("course") || value.includes("learn")) return "study";
  if (value.includes("intern")) return "internship";
  if (value.includes("job") || value.includes("work") || value.includes("salary")) return "job";
  if (value.includes("freelance") || value.includes("client")) return "freelance";
  if (value.includes("project") || value.includes("app") || value.includes("saas")) return "project";
  return "custom";
}

function normalizeKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function selectAll(table, queryBuilder) {
  const { data, error } = await queryBuilder;
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

async function upsertLifeLink(accountId, sourceType, sourceId, targetType, targetId, relationshipType) {
  if (!sourceId || !targetId) return;
  const { error } = await supabase.from("life_links").upsert(
    {
      account_id: accountId,
      source_type: sourceType,
      source_id: sourceId,
      target_type: targetType,
      target_id: targetId,
      relationship_type: relationshipType
    },
    { onConflict: "account_id,source_type,source_id,target_type,target_id,relationship_type" }
  );
  if (error) throw error;
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, full_name, email")
  .ilike("email", targetEmail)
  .maybeSingle();

if (profileError) throw profileError;
if (!profile) {
  console.error(`No profile found for ${targetEmail}.`);
  process.exit(1);
}

const accountUsers = await selectAll(
  "account_users",
  supabase
    .from("account_users")
    .select("account_id, role, created_at, accounts:accounts(id, name, currency_code, created_at)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true })
);

const primaryAccount = accountUsers[0];
if (!primaryAccount) {
  console.error(`No account membership found for ${targetEmail}.`);
  process.exit(1);
}

const accountId = primaryAccount.account_id;
const currencyCode = primaryAccount.accounts?.currency_code ?? "USD";

const [existingPhases, existingProjects] = await Promise.all([
  selectAll("life_phases", supabase.from("life_phases").select("id").eq("account_id", accountId).limit(1)),
  selectAll("life_projects", supabase.from("life_projects").select("id").eq("account_id", accountId).limit(1))
]);

if (!force && (existingPhases.length > 0 || existingProjects.length > 0)) {
  console.error("LifeFlow records already exist for this account. Review them first, or re-run with --force.");
  process.exit(1);
}

const [spaces, objectives, habits, events] = await Promise.all([
  selectAll("knowledge_spaces", supabase.from("knowledge_spaces").select("id, title, created_at").eq("account_id", accountId).order("created_at", { ascending: true })),
  selectAll("habit_objectives", supabase.from("habit_objectives").select("id, title, description, created_at").eq("account_id", accountId).order("created_at", { ascending: true })),
  selectAll("habits", supabase.from("habits").select("id, objective_id, title").eq("account_id", accountId).order("created_at", { ascending: true })),
  selectAll("calendar_events", supabase.from("calendar_events").select("id, title, details, event_type, event_date").eq("account_id", accountId).order("event_date", { ascending: true, nullsFirst: false }))
]);

const importantEvents = events
  .filter((event) => /job|school|study|intern|project|launch|salary|exam|graduat|interview/i.test(`${event.title} ${event.details ?? ""} ${event.event_type ?? ""}`))
  .slice(0, 30);

const phaseProposals = [
  ...importantEvents.map((event) => ({
    source: "calendar_event",
    sourceId: event.id,
    title: event.title,
    phaseType: keywordPhaseType(`${event.title} ${event.event_type}`),
    status: event.event_date && event.event_date < new Date().toISOString().slice(0, 10) ? "past" : "planned",
    startDate: event.event_date ?? null,
    summary: event.details ?? null
  })),
  ...objectives.slice(0, 8).map((objective) => ({
    source: "objective",
    sourceId: objective.id,
    title: objective.title,
    phaseType: keywordPhaseType(`${objective.title} ${objective.description ?? ""}`),
    status: "current",
    startDate: objective.created_at?.slice(0, 10) ?? null,
    summary: objective.description ?? null
  }))
];

const dedupedPhaseProposals = [];
const seenPhaseTitles = new Set();
for (const proposal of phaseProposals) {
  const key = normalizeKey(proposal.title);
  if (seenPhaseTitles.has(key)) continue;
  seenPhaseTitles.add(key);
  dedupedPhaseProposals.push(proposal);
}

const sourceToPhaseId = new Map();
let createdPhaseCount = 0;
for (const [position, phase] of dedupedPhaseProposals.entries()) {
  const { data, error } = await supabase
    .from("life_phases")
    .insert({
      account_id: accountId,
      title: phase.title,
      phase_type: phase.phaseType,
      status: phase.status,
      start_date: phase.startDate,
      summary: phase.summary,
      currency_code: currencyCode,
      position
    })
    .select("id")
    .single();
  if (error) throw error;
  createdPhaseCount += 1;
  sourceToPhaseId.set(`${phase.source}:${phase.sourceId}`, data.id);
}

let updatedObjectives = 0;
let updatedEvents = 0;
let updatedTasks = 0;
for (const objective of objectives) {
  const phaseId = sourceToPhaseId.get(`objective:${objective.id}`);
  if (!phaseId) continue;
  const { error } = await supabase.from("habit_objectives").update({ phase_id: phaseId }).eq("account_id", accountId).eq("id", objective.id);
  if (error) throw error;
  updatedObjectives += 1;
  await upsertLifeLink(accountId, "phase", phaseId, "goal", objective.id, "migrated_from_objective");

  const objectiveHabits = habits.filter((habit) => habit.objective_id === objective.id);
  for (const habit of objectiveHabits) {
    const { error: taskError } = await supabase.from("habits").update({ phase_id: phaseId }).eq("account_id", accountId).eq("id", habit.id);
    if (taskError) throw taskError;
    updatedTasks += 1;
    await upsertLifeLink(accountId, "phase", phaseId, "task", habit.id, "migrated_from_objective");
  }
}

for (const event of importantEvents) {
  const phaseId = sourceToPhaseId.get(`calendar_event:${event.id}`);
  if (!phaseId) continue;
  const { error } = await supabase.from("calendar_events").update({ phase_id: phaseId }).eq("account_id", accountId).eq("id", event.id);
  if (error) throw error;
  updatedEvents += 1;
  await upsertLifeLink(accountId, "phase", phaseId, "event", event.id, "migrated_from_event");
}

const projectCandidates = [
  ...spaces
    .filter((space) => keywordPhaseType(space.title) === "project" || /portfolio|app|api|backend|frontend|saas|project/i.test(space.title))
    .map((space) => ({ source: "knowledge_space", sourceId: space.id, name: space.title, description: space.description ?? null })),
  ...objectives
    .filter((objective) => /project|app|api|backend|frontend|saas|portfolio/i.test(`${objective.title} ${objective.description ?? ""}`))
    .map((objective) => ({ source: "objective", sourceId: objective.id, name: objective.title, description: objective.description ?? null }))
];

let createdProjectCount = 0;
let updatedKnowledgeSpaces = 0;
for (const candidate of projectCandidates) {
  const { data, error } = await supabase
    .from("life_projects")
    .insert({
      account_id: accountId,
      name: candidate.name,
      description: candidate.description,
      status: "active",
      progress: 0
    })
    .select("id")
    .single();
  if (error) throw error;
  createdProjectCount += 1;

  if (candidate.source === "knowledge_space") {
    const { error: updateError } = await supabase
      .from("knowledge_spaces")
      .update({ project_id: data.id })
      .eq("account_id", accountId)
      .eq("id", candidate.sourceId);
    if (updateError) throw updateError;
    updatedKnowledgeSpaces += 1;
    await upsertLifeLink(accountId, "project", data.id, "knowledge_space", candidate.sourceId, "migrated_from_knowledge_space");
  }

  if (candidate.source === "objective") {
    const { error: updateError } = await supabase
      .from("habit_objectives")
      .update({ project_id: data.id })
      .eq("account_id", accountId)
      .eq("id", candidate.sourceId);
    if (updateError) throw updateError;
    await upsertLifeLink(accountId, "project", data.id, "goal", candidate.sourceId, "migrated_from_objective");
  }
}

console.log(
  JSON.stringify(
    {
      target_email: targetEmail,
      account_id: accountId,
      created_phases: createdPhaseCount,
      created_projects: createdProjectCount,
      updated_objectives: updatedObjectives,
      updated_tasks: updatedTasks,
      updated_events: updatedEvents,
      updated_knowledge_spaces: updatedKnowledgeSpaces,
      deleted_other_accounts: false
    },
    null,
    2
  )
);
