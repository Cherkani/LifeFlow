#!/usr/bin/env node
/**
 * Read-only LifeFlow migration preview.
 *
 * This script locates one account by profile email, exports the current account
 * shape, and prints proposed LifeFlow phases/projects. It does not mutate data
 * and does not require the user's password.
 */
import { config as loadEnv } from "dotenv";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "..", "supabase", ".env") });
loadEnv({ path: join(__dirname, "..", ".env") });
loadEnv({ path: join(__dirname, "..", "..", "wh_frontend", ".env") });

const targetEmail = process.argv.find((arg) => arg.startsWith("--email="))?.slice("--email=".length) ?? "cherkaniaymen1@gmail.com";
const outputPath = process.argv.find((arg) => arg.startsWith("--out="))?.slice("--out=".length) ?? null;

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

function groupByMonth(rows, dateKey) {
  return rows.reduce((acc, row) => {
    const value = row[dateKey];
    const key = typeof value === "string" && value.length >= 7 ? value.slice(0, 7) : "undated";
    acc[key] ??= [];
    acc[key].push(row);
    return acc;
  }, {});
}

function sumAmount(rows) {
  return rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
}

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

function compactRows(rows, fields) {
  return rows.map((row) => Object.fromEntries(fields.map((field) => [field, row[field] ?? null])));
}

async function selectAll(table, queryBuilder) {
  const { data, error } = await queryBuilder;
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  return data ?? [];
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, full_name, email, timezone, role, is_active, created_at")
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

const [
  spaces,
  objectives,
  habits,
  sessions,
  templates,
  weeks,
  templateEntries,
  categories,
  ledgerEntries,
  debts,
  debtPayments,
  subscriptions,
  events
] = await Promise.all([
  selectAll("knowledge_spaces", supabase.from("knowledge_spaces").select("*").eq("account_id", accountId).order("created_at", { ascending: true })),
  selectAll("habit_objectives", supabase.from("habit_objectives").select("*").eq("account_id", accountId).order("created_at", { ascending: true })),
  selectAll("habits", supabase.from("habits").select("*").eq("account_id", accountId).order("created_at", { ascending: true })),
  selectAll("habit_sessions", supabase.from("habit_sessions").select("*").order("session_date", { ascending: true })),
  selectAll("templates", supabase.from("templates").select("*").eq("account_id", accountId).order("created_at", { ascending: true })),
  selectAll("weeks", supabase.from("weeks").select("*").eq("account_id", accountId).order("week_start_date", { ascending: true })),
  selectAll("template_entries", supabase.from("template_entries").select("*")),
  selectAll("finance_categories", supabase.from("finance_categories").select("*").eq("account_id", accountId).order("name")),
  selectAll("ledger_entries", supabase.from("ledger_entries").select("*").eq("account_id", accountId).order("occurred_on", { ascending: true })),
  selectAll("debts", supabase.from("debts").select("*").eq("account_id", accountId).order("created_at", { ascending: true })),
  selectAll("debt_payments", supabase.from("debt_payments").select("*").eq("account_id", accountId).order("paid_at", { ascending: true })),
  selectAll("subscriptions", supabase.from("subscriptions").select("*").eq("account_id", accountId).order("created_at", { ascending: true })),
  selectAll("calendar_events", supabase.from("calendar_events").select("*").eq("account_id", accountId).order("event_date", { ascending: true, nullsFirst: false }))
]);

const habitIds = new Set(habits.map((habit) => habit.id));
const templateIds = new Set(templates.map((template) => template.id));
const scopedSessions = sessions.filter((session) => habitIds.has(session.habit_id));
const scopedTemplateEntries = templateEntries.filter((entry) => templateIds.has(entry.template_id));

const ledgerByMonth = groupByMonth(ledgerEntries, "occurred_on");
const financeMonthlyPatterns = Object.entries(ledgerByMonth).map(([month, rows]) => {
  const income = rows.filter((row) => row.entry_type === "income");
  const expense = rows.filter((row) => row.entry_type === "expense");
  return {
    month,
    income: Number(sumAmount(income).toFixed(2)),
    spending: Number(sumAmount(expense).toFixed(2)),
    net: Number((sumAmount(income) - sumAmount(expense)).toFixed(2)),
    entries: rows.length
  };
});

const objectiveTaskCounts = objectives.map((objective) => ({
  id: objective.id,
  title: objective.title,
  tasks: habits.filter((habit) => habit.objective_id === objective.id).length,
  sessions: scopedSessions.filter((session) => habits.some((habit) => habit.id === session.habit_id && habit.objective_id === objective.id)).length
}));

const knowledgeProjectCandidates = spaces
  .filter((space) => keywordPhaseType(space.title) === "project" || /portfolio|app|api|backend|frontend|saas|project/i.test(space.title))
  .map((space) => ({
    source: "knowledge_space",
    id: space.id,
    name: space.title,
    proposed_status: "active"
  }));

const objectiveProjectCandidates = objectives
  .filter((objective) => /project|app|api|backend|frontend|saas|portfolio/i.test(`${objective.title} ${objective.description ?? ""}`))
  .map((objective) => ({
    source: "objective",
    id: objective.id,
    name: objective.title,
    proposed_status: "active"
  }));

const importantEvents = events
  .filter((event) => /job|school|study|intern|project|launch|salary|exam|graduat|interview/i.test(`${event.title} ${event.details ?? ""} ${event.event_type ?? ""}`))
  .slice(0, 30)
  .map((event) => ({
    id: event.id,
    title: event.title,
    date: event.event_date,
    type: event.event_type
  }));

const proposedPhases = [
  ...importantEvents.map((event) => ({
    source: "calendar_event",
    source_id: event.id,
    title: event.title,
    phase_type: keywordPhaseType(`${event.title} ${event.type}`),
    status: event.date && event.date < new Date().toISOString().slice(0, 10) ? "past" : "planned",
    start_date: event.date
  })),
  ...objectives.slice(0, 8).map((objective) => ({
    source: "objective",
    source_id: objective.id,
    title: objective.title,
    phase_type: keywordPhaseType(`${objective.title} ${objective.description ?? ""}`),
    status: "current",
    start_date: objective.created_at?.slice(0, 10) ?? null
  }))
];

const report = {
  target_email: targetEmail,
  generated_at: new Date().toISOString(),
  mutates_data: false,
  profile,
  primary_account: {
    account_id: accountId,
    role: primaryAccount.role,
    account: primaryAccount.accounts
  },
  counts: {
    knowledge_spaces: spaces.length,
    objectives: objectives.length,
    habits_daily_tasks: habits.length,
    habit_sessions: scopedSessions.length,
    templates: templates.length,
    generated_weeks: weeks.length,
    template_entries: scopedTemplateEntries.length,
    finance_categories: categories.length,
    ledger_entries: ledgerEntries.length,
    debts: debts.length,
    debt_payments: debtPayments.length,
    subscriptions: subscriptions.length,
    calendar_events: events.length
  },
  detected: {
    objectives: objectiveTaskCounts,
    daily_task_patterns: compactRows(habits, ["id", "objective_id", "title", "type", "weekly_target_minutes", "minimum_minutes", "created_at"]),
    finance_monthly_patterns: financeMonthlyPatterns,
    recurring_subscriptions: compactRows(subscriptions, ["id", "name", "amount", "recurrence", "next_due_date", "end_date", "is_active"]),
    important_events: importantEvents,
    knowledge_project_candidates: knowledgeProjectCandidates,
    objective_project_candidates: objectiveProjectCandidates
  },
  proposed: {
    phases: proposedPhases,
    projects: [...knowledgeProjectCandidates, ...objectiveProjectCandidates]
  },
  next_step: "Review this report before running any future apply script. No other accounts are changed by this preview."
};

const serialized = JSON.stringify(report, null, 2);
if (outputPath) {
  writeFileSync(outputPath, serialized);
  console.log(`Wrote read-only LifeFlow migration preview to ${outputPath}`);
} else {
  console.log(serialized);
}
