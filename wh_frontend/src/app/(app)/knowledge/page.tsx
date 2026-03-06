import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAppContext } from "@/lib/server-context";

import { createCardAction, createKnowledgeSpaceAction, createNoteAction } from "./actions";

type Note = {
  id: string;
  space_id: string;
  title: string;
  position: number;
  created_at: string;
};

type BrainCard = {
  id: string;
  note_id: string;
  content: string;
  position: number;
  created_at: string;
};

export default async function KnowledgePage() {
  const { supabase, account } = await requireAppContext();

  const spacesRes = await supabase
    .from("knowledge_spaces")
    .select("id, title, created_at, updated_at")
    .eq("account_id", account.accountId)
    .order("updated_at", { ascending: false });

  const spaces = spacesRes.data ?? [];
  const spaceIds = spaces.map((space) => space.id);
  const notesRes =
    spaceIds.length > 0
      ? await supabase
          .from("notes")
          .select("id, space_id, title, position, created_at")
          .in("space_id", spaceIds)
          .order("position", { ascending: true })
      : { data: [] as Note[] };

  const notes = (notesRes.data ?? []) as Note[];
  const noteIds = notes.map((note) => note.id);
  const cardsRes =
    noteIds.length > 0
      ? await supabase
          .from("cards")
          .select("id, note_id, content, position, created_at")
          .in("note_id", noteIds)
          .order("position", { ascending: true })
      : { data: [] as BrainCard[] };
  const cards = (cardsRes.data ?? []) as BrainCard[];

  const notesBySpace = new Map<string, Note[]>();
  for (const note of notes) {
    const collection = notesBySpace.get(note.space_id) ?? [];
    collection.push(note);
    notesBySpace.set(note.space_id, collection);
  }

  const cardsByNote = new Map<string, BrainCard[]>();
  for (const card of cards) {
    const collection = cardsByNote.get(card.note_id) ?? [];
    collection.push(card);
    cardsByNote.set(card.note_id, collection);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Knowledge"
        description="Build strategic clarity with spaces, notes, and atomic cards."
      />

      <Card>
        <CardHeader>
          <CardTitle>New knowledge space</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createKnowledgeSpaceAction} className="flex flex-col gap-3 sm:flex-row">
            <input
              name="title"
              required
              placeholder="e.g. Master System Design"
              className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
            />
            <SubmitButton label="Create space" />
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {spaces.length > 0 ? (
          spaces.map((space) => {
            const spaceNotes = notesBySpace.get(space.id) ?? [];

            return (
              <Card key={space.id}>
                <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>{space.title}</CardTitle>
                    <p className="mt-1 text-xs text-slate-500">{spaceNotes.length} notes</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={createNoteAction} className="flex flex-col gap-3 sm:flex-row">
                    <input type="hidden" name="spaceId" value={space.id} />
                    <input
                      name="title"
                      required
                      placeholder="New note title"
                      className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400"
                    />
                    <SubmitButton label="Add note" pendingLabel="Adding..." />
                  </form>

                  <div className="space-y-3">
                    {spaceNotes.length > 0 ? (
                      spaceNotes.map((note) => {
                        const noteCards = cardsByNote.get(note.id) ?? [];

                        return (
                          <div key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-3 flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-800">{note.title}</h4>
                              <span className="text-xs text-slate-500">{noteCards.length} cards</span>
                            </div>

                            <form action={createCardAction} className="mb-3 flex flex-col gap-2 sm:flex-row">
                              <input type="hidden" name="noteId" value={note.id} />
                              <input
                                name="content"
                                required
                                placeholder="Atomic insight"
                                className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400"
                              />
                              <SubmitButton label="Add card" pendingLabel="Adding..." />
                            </form>

                            {noteCards.length > 0 ? (
                              <div className="space-y-2">
                                {noteCards.map((card) => (
                                  <p key={card.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                    {card.content}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">No cards yet.</p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500">No notes yet. Add your first topic above.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent>
              <p className="text-sm text-slate-500">Create a space to start structuring your strategic knowledge.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
