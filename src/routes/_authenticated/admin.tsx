import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Grid3x3, ShieldAlert, Users2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchSports } from "@/lib/fanzeno";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Ops console — Fanzeno" },
      {
        name: "description",
        content: "Staff console for Fanzeno grids, athletes, criteria and player reports.",
      },
      { property: "og:title", content: "Ops console — Fanzeno" },
      { property: "og:description", content: "Staff tools for the Fanzeno sports grid." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

async function fetchGrids() {
  const { data, error } = await supabase
    .from("grids")
    .select("id, scheduled_for, difficulty, published_at, competition_ids, sport_id, sports!inner(name, slug)")
    .order("scheduled_for", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

async function fetchAthletes(term: string) {
  let query = supabase
    .from("athletes")
    .select("id, name, aliases, sport_id, sports!inner(name)")
    .order("name")
    .limit(40);
  if (term.trim()) query = query.ilike("name", `%${term.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function fetchCriteria() {
  const { data, error } = await supabase
    .from("criteria")
    .select("id, label, sports!inner(name)")
    .order("label")
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

function AdminPage() {
  const { isStaff, loading } = useAuth();

  if (loading) {
    return <Shell>Checking your access…</Shell>;
  }

  if (!isStaff) {
    return (
      <Shell>
        <ShieldAlert className="size-8 text-destructive" />
        <h1 className="mt-4 text-3xl">Staff only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account doesn&apos;t have an ops role on this workspace.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to the grid</Link>
        </Button>
      </Shell>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <p className="eyebrow">Ops console</p>
      <h1 className="mt-3 text-4xl">Content control</h1>

      <Tabs defaultValue="grids" className="mt-7">
        <TabsList>
          <TabsTrigger value="grids">Grids</TabsTrigger>
          <TabsTrigger value="athletes">Athletes</TabsTrigger>
          <TabsTrigger value="criteria">Criteria</TabsTrigger>
          <TabsTrigger value="sports">Sports</TabsTrigger>
        </TabsList>

        <TabsContent value="grids">
          <GridsPanel />
        </TabsContent>
        <TabsContent value="athletes">
          <AthletesPanel />
        </TabsContent>
        <TabsContent value="criteria">
          <CriteriaPanel />
        </TabsContent>
        <TabsContent value="sports">
          <SportsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GridsPanel() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["admin-grids"], queryFn: fetchGrids });
  const { data: competitions } = useQuery({
    queryKey: ["competitions"],
    queryFn: fetchCompetitions,
  });

  const togglePublish = async (id: string, published: boolean) => {
    const { error } = await supabase
      .from("grids")
      .update({ published_at: published ? null : new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(published ? "Grid unpublished." : "Grid published.");
    void refetch();
  };

  const toggleCompetition = async (gridId: string, current: string[], competitionId: string) => {
    const next = current.includes(competitionId)
      ? current.filter((id) => id !== competitionId)
      : [...current, competitionId];
    const { error } = await supabase.from("grids").update({ competition_ids: next }).eq("id", gridId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void refetch();
  };

  return (
    <Panel icon={<Grid3x3 className="size-4 text-primary" />} title="Scheduled grids">
      {isLoading && <Row>Loading grids…</Row>}
      {(data ?? []).map((grid) => {
        const sport = grid.sports as unknown as { name: string };
        const published = !!grid.published_at;
        const scopes = (competitions ?? []).filter((c) => c.sport_id === grid.sport_id);
        return (
          <div key={grid.id} className="px-5 py-3.5 text-sm">
            <div className="flex items-center gap-3">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span className="w-24 font-semibold">{grid.scheduled_for ?? "unscheduled"}</span>
              <span className="flex-1">{sport.name}</span>
              <span className="text-xs text-muted-foreground">diff {grid.difficulty}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${
                  published ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {published ? "live" : "draft"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void togglePublish(grid.id, published)}
              >
                {published ? "Unpublish" : "Publish"}
              </Button>
            </div>
            {scopes.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Scope
                </span>
                {scopes.map((c) => {
                  const on = grid.competition_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.name}
                      aria-pressed={on}
                      onClick={() => void toggleCompetition(grid.id, grid.competition_ids, c.id)}
                      className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-bold ${
                        on
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c.short_name ?? c.slug}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {!isLoading && !data?.length && <Row>No grids yet.</Row>}
    </Panel>
  );
}

function AthletesPanel() {
  const [term, setTerm] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-athletes", term],
    queryFn: () => fetchAthletes(term),
  });

  return (
    <Panel icon={<Users2 className="size-4 text-primary" />} title="Athlete database">
      <div className="px-5 py-3">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search athletes…"
        />
      </div>
      {isLoading && <Row>Searching…</Row>}
      {(data ?? []).map((athlete) => (
        <div key={athlete.id} className="flex items-center gap-3 px-5 py-3 text-sm">
          <span className="flex-1 font-semibold">{athlete.name}</span>
          <span className="hidden max-w-[45%] truncate text-xs text-muted-foreground sm:block">
            {(athlete.aliases ?? []).join(", ")}
          </span>
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {(athlete.sports as unknown as { name: string }).name}
          </span>
        </div>
      ))}
      {!isLoading && !data?.length && <Row>No athletes matched.</Row>}
    </Panel>
  );
}

function CriteriaPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-criteria"], queryFn: fetchCriteria });
  return (
    <Panel icon={<Grid3x3 className="size-4 text-primary" />} title="Criteria library">
      {isLoading && <Row>Loading criteria…</Row>}
      {(data ?? []).map((c) => (
        <div key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
          <span className="flex-1 font-semibold">{c.label}</span>
          
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {(c.sports as unknown as { name: string }).name}
          </span>
        </div>
      ))}
      {!isLoading && !data?.length && <Row>No criteria yet.</Row>}
    </Panel>
  );
}

function SportsPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["sports"], queryFn: fetchSports });
  return (
    <Panel icon={<Users2 className="size-4 text-primary" />} title="Sports">
      {isLoading && <Row>Loading sports…</Row>}
      {(data ?? []).map((s) => (
        <div key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm">
          <span className="flex-1 font-semibold">{s.name}</span>
          <span className="text-xs text-muted-foreground">{s.slug}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] ${
              s.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {s.enabled ? "on" : "off"}
          </span>
        </div>
      ))}
    </Panel>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel mt-5 divide-y divide-border/70">
      <div className="flex items-center gap-2 px-5 py-3.5">
        {icon}
        <h2 className="text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <p className="px-5 py-4 text-sm text-muted-foreground">{children}</p>
);

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">{children}</div>
);
