import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { getPrimaryAccountForUser } from "@/lib/server-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function addRowsSheet(workbook: ExcelJS.Workbook, name: string, rows: Array<Record<string, unknown>>) {
  const worksheet = workbook.addWorksheet(name);
  if (rows.length === 0) {
    worksheet.addRow(["(no data)"]);
    return;
  }
  const headers = Object.keys(rows[0]);
  worksheet.columns = headers.map((key) => ({
    header: key,
    key
  }));
  rows.forEach((row) => {
    const record = Object.fromEntries(headers.map((header) => [header, row[header] ?? ""]));
    worksheet.addRow(record);
  });
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await getPrimaryAccountForUser(user);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const accountId = account.accountId;

  const [
    profileRes,
    spacesRes,
    objectivesRes,
    habitsRes,
    sessionsRes,
    templatesRes,
    weeksRes,
    entriesRes,
    categoriesRes,
    ledgerRes,
    debtsRes,
    paymentsRes,
    subsRes,
    eventsRes
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, email, timezone, role, is_active, created_at").eq("id", user.id).maybeSingle(),
    supabase.from("knowledge_spaces").select("id, title, image_url, created_at").eq("account_id", accountId).order("title"),
    supabase.from("habit_objectives").select("id, title, description, image_url, created_at").eq("account_id", accountId).order("title"),
    supabase.from("habits").select("id, objective_id, title, type, weekly_target_minutes, minimum_minutes, is_active, created_at").eq("account_id", accountId).order("title"),
    supabase.from("habit_sessions").select("id, habit_id, session_date, planned_minutes, actual_minutes, completed, notes").order("session_date", { ascending: false }).limit(500),
    supabase.from("templates").select("id, name, objective_id, created_at").eq("account_id", accountId).order("name"),
    supabase.from("weeks").select("id, template_id, week_start_date, created_at").eq("account_id", accountId).order("week_start_date", { ascending: false }),
    supabase.from("template_entries").select("id, template_id, habit_id, day_of_week, planned_minutes, minimum_minutes, is_required"),
    supabase.from("finance_categories").select("id, name, kind, color, monthly_limit, created_at").eq("account_id", accountId).order("name"),
    supabase.from("ledger_entries").select("id, category_id, entry_type, amount, occurred_on, notes, created_at").eq("account_id", accountId).order("occurred_on", { ascending: false }).limit(500),
    supabase.from("debts").select("id, name, type, principal, remaining_balance, status, due_date, created_at").eq("account_id", accountId).order("created_at", { ascending: false }),
    supabase.from("debt_payments").select("id, debt_id, amount, paid_at, method, notes").eq("account_id", accountId).order("paid_at", { ascending: false }).limit(200),
    supabase.from("subscriptions").select("id, name, amount, recurrence, next_due_date, end_date, is_active, created_at").eq("account_id", accountId).order("name"),
    supabase.from("calendar_events").select("id, title, details, event_date, event_time, event_type, created_at").eq("account_id", accountId).order("event_date", { ascending: false }).limit(500)
  ]);

  const spaces = (spacesRes.data ?? []) as Array<{ id: string }>;
  const spaceIds = spaces.map((s) => s.id);

  let itemsData: unknown[] = [];
  if (spaceIds.length > 0) {
    const itemsRes2 = await supabase
      .from("knowledge_items")
      .select("id, space_id, kind, title, url, content, created_at, checked")
      .in("space_id", spaceIds)
      .order("created_at", { ascending: false });
    itemsData = itemsRes2.data ?? [];
  }

  const sessionsData = (sessionsRes.data ?? []).filter((s: { habit_id: string }) => {
    const habitIds = (habitsRes.data ?? []).map((h: { id: string }) => h.id);
    return habitIds.includes(s.habit_id);
  });

  const entriesData = (entriesRes.data ?? []).filter((e: { template_id: string }) => {
    const templateIds = (templatesRes.data ?? []).map((t: { id: string }) => t.id);
    return templateIds.includes(e.template_id);
  });

  const wb = new ExcelJS.Workbook();

  const profileRows = profileRes.data ? [profileRes.data as Record<string, unknown>] : [];
  addRowsSheet(wb, "Profile", profileRows);

  const knowledgeRows = (spacesRes.data ?? []).map((s: Record<string, unknown>) => ({
    Topic: s.title,
    "Image URL": s.image_url,
    "Created at": s.created_at
  }));
  addRowsSheet(wb, "Knowledge Topics", knowledgeRows);

  const itemsRows = (itemsData as Array<Record<string, unknown>>).map((i) => ({
    "Space ID": i.space_id,
    Kind: i.kind,
    Title: i.title,
    URL: i.url,
    Content: i.content,
    Checked: i.checked,
    "Created at": i.created_at
  }));
  addRowsSheet(wb, "Knowledge Items", itemsRows);

  const objectivesRows = (objectivesRes.data ?? []).map((o: Record<string, unknown>) => ({
    Title: o.title,
    Description: o.description,
    "Created at": o.created_at
  }));
  addRowsSheet(wb, "Habit Objectives", objectivesRows);

  const habitsRows = (habitsRes.data ?? []).map((h: Record<string, unknown>) => ({
    Title: h.title,
    Type: h.type,
    "Weekly target (min)": h.weekly_target_minutes,
    "Minimum (min)": h.minimum_minutes,
    "Is active": h.is_active,
    "Created at": h.created_at
  }));
  addRowsSheet(wb, "Habits", habitsRows);

  const sessionsRows = sessionsData.map((s: Record<string, unknown>) => ({
    "Habit ID": s.habit_id,
    "Session date": s.session_date,
    "Planned (min)": s.planned_minutes,
    "Actual (min)": s.actual_minutes,
    Completed: s.completed,
    Notes: s.notes
  }));
  addRowsSheet(wb, "Habit Sessions", sessionsRows);

  const templatesRows = (templatesRes.data ?? []).map((t: Record<string, unknown>) => ({
    Name: t.name,
    "Created at": t.created_at
  }));
  addRowsSheet(wb, "Templates", templatesRows);

  const weeksRows = (weeksRes.data ?? []).map((w: Record<string, unknown>) => ({
    "Week start": w.week_start_date,
    "Created at": w.created_at
  }));
  addRowsSheet(wb, "Weeks", weeksRows);

  const entriesRows = entriesData.map((e: Record<string, unknown>) => ({
    "Template ID": e.template_id,
    "Habit ID": e.habit_id,
    "Day of week": e.day_of_week,
    "Planned (min)": e.planned_minutes,
    "Minimum (min)": e.minimum_minutes,
    Required: e.is_required
  }));
  addRowsSheet(wb, "Template Entries", entriesRows);

  const categoriesRows = (categoriesRes.data ?? []).map((c: Record<string, unknown>) => ({
    Name: c.name,
    Kind: c.kind,
    "Monthly limit": c.monthly_limit,
    "Created at": c.created_at
  }));
  addRowsSheet(wb, "Finance Categories", categoriesRows);

  const ledgerRows = (ledgerRes.data ?? []).map((l: Record<string, unknown>) => ({
    Type: l.entry_type,
    Amount: l.amount,
    Date: l.occurred_on,
    Notes: l.notes,
    "Created at": l.created_at
  }));
  addRowsSheet(wb, "Ledger Entries", ledgerRows);

  const debtsRows = (debtsRes.data ?? []).map((d: Record<string, unknown>) => ({
    Name: d.name,
    Type: d.type,
    Principal: d.principal,
    "Remaining balance": d.remaining_balance,
    Status: d.status,
    "Due date": d.due_date
  }));
  addRowsSheet(wb, "Debts", debtsRows);

  const paymentsRows = (paymentsRes.data ?? []).map((p: Record<string, unknown>) => ({
    "Debt ID": p.debt_id,
    Amount: p.amount,
    "Paid at": p.paid_at,
    Method: p.method,
    Notes: p.notes
  }));
  addRowsSheet(wb, "Debt Payments", paymentsRows);

  const subsRows = (subsRes.data ?? []).map((s: Record<string, unknown>) => ({
    Name: s.name,
    Amount: s.amount,
    Recurrence: s.recurrence,
    "Next due": s.next_due_date,
    "End date": s.end_date,
    Active: s.is_active
  }));
  addRowsSheet(wb, "Subscriptions", subsRows);

  const eventsRows = (eventsRes.data ?? []).map((e: Record<string, unknown>) => ({
    Title: e.title,
    Details: e.details,
    Date: e.event_date,
    Time: e.event_time ?? "",
    Type: e.event_type,
    "Created at": e.created_at
  }));
  addRowsSheet(wb, "Calendar Events", eventsRows);

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `momentum-grid-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
