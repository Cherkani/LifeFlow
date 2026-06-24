import type { Database } from "@/lib/types/database";

import type { Supabase } from "./types";

export type LifePhaseRow = Database["public"]["Tables"]["life_phases"]["Row"];
export type LifeProjectRow = Database["public"]["Tables"]["life_projects"]["Row"];

export type LifeGoalRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  phase_id: string | null;
  project_id: string | null;
};

export type LifeTaskRow = {
  id: string;
  title: string;
  objective_id: string | null;
  phase_id: string | null;
  project_id: string | null;
  minimum_minutes: number | null;
  weekly_target_minutes: number | null;
};

export type LifeFinanceRow = {
  id: string;
  entry_type: "income" | "expense";
  amount: string;
  occurred_on: string;
  notes: string | null;
  phase_id: string | null;
  project_id: string | null;
  category_id: string | null;
};

export type LifeEventRow = {
  id: string;
  title: string;
  details: string | null;
  event_date: string | null;
  event_time: string | null;
  event_type: string;
  phase_id: string | null;
  project_id: string | null;
};

export type LifeKnowledgeSpaceRow = {
  id: string;
  title: string;
  image_url: string | null;
  phase_id: string | null;
  project_id: string | null;
  created_at: string;
};

export type LifePageData = {
  phases: LifePhaseRow[];
  projects: LifeProjectRow[];
  goals: LifeGoalRow[];
  tasks: LifeTaskRow[];
  sessions: Array<{ id: string; habit_id: string; session_date: string; actual_minutes: number | null; completed: boolean }>;
  financeEntries: LifeFinanceRow[];
  events: LifeEventRow[];
  knowledgeSpaces: LifeKnowledgeSpaceRow[];
};

export type LifeOptionData = {
  phases: Array<Pick<LifePhaseRow, "id" | "title" | "status">>;
  projects: Array<Pick<LifeProjectRow, "id" | "name" | "phase_id" | "status">>;
};

export async function getLifeOptions(supabase: Supabase, accountId: string): Promise<LifeOptionData> {
  const [phasesRes, projectsRes] = await Promise.all([
    supabase
      .from("life_phases")
      .select("id, title, status")
      .eq("account_id", accountId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("life_projects")
      .select("id, name, phase_id, status")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
  ]);

  return {
    phases: (phasesRes.data ?? []) as LifeOptionData["phases"],
    projects: (projectsRes.data ?? []) as LifeOptionData["projects"]
  };
}

export async function getLifePageData(supabase: Supabase, accountId: string): Promise<LifePageData> {
  const [phasesRes, projectsRes, goalsRes, tasksRes, financeRes, eventsRes, spacesRes] = await Promise.all([
    supabase
      .from("life_phases")
      .select("*")
      .eq("account_id", accountId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("life_projects")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("habit_objectives")
      .select("id, title, description, image_url, phase_id, project_id")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false }),
    supabase
      .from("habits")
      .select("id, title, objective_id, phase_id, project_id, minimum_minutes, weekly_target_minutes")
      .eq("account_id", accountId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("ledger_entries")
      .select("id, entry_type, amount, occurred_on, notes, phase_id, project_id, category_id")
      .eq("account_id", accountId)
      .order("occurred_on", { ascending: false })
      .limit(500),
    supabase
      .from("calendar_events")
      .select("id, title, details, event_date, event_time, event_type, phase_id, project_id")
      .eq("account_id", accountId)
      .order("event_date", { ascending: false, nullsFirst: false })
      .limit(300),
    supabase
      .from("knowledge_spaces")
      .select("id, title, image_url, phase_id, project_id, created_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
  ]);

  const goals = (goalsRes.data ?? []) as LifeGoalRow[];
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const tasks = ((tasksRes.data ?? []) as LifeTaskRow[]).map((task) => {
    const goal = task.objective_id ? goalById.get(task.objective_id) : null;
    const hasOverride = task.phase_id !== null || task.project_id !== null;
    return hasOverride
      ? task
      : { ...task, phase_id: goal?.phase_id ?? null, project_id: goal?.project_id ?? null };
  });
  const taskIds = tasks.map((task) => task.id);
  const sessionsRes =
    taskIds.length > 0
      ? await supabase
          .from("habit_sessions")
          .select("id, habit_id, session_date, actual_minutes, completed")
          .in("habit_id", taskIds)
          .order("session_date", { ascending: false })
          .limit(500)
      : { data: [] };

  return {
    phases: (phasesRes.data ?? []) as LifePhaseRow[],
    projects: (projectsRes.data ?? []) as LifeProjectRow[],
    goals,
    tasks,
    sessions: (sessionsRes.data ?? []) as LifePageData["sessions"],
    financeEntries: (financeRes.data ?? []) as LifeFinanceRow[],
    events: (eventsRes.data ?? []) as LifeEventRow[],
    knowledgeSpaces: (spacesRes.data ?? []) as LifeKnowledgeSpaceRow[]
  };
}
