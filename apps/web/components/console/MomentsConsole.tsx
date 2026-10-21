"use client";

import { defineKeys, keepPreviousData, krizakaFetch, useQuery } from "@krizaka/query";
import { Badge } from "@krizaka/ui/badge";
import { DataTable, type DataTableColumn, DataTableFilters, type DataTableQuery } from "@krizaka/ui/data-table";
import { Stat, StatGrid } from "@krizaka/ui/stat";
import { useMemo, useState } from "react";
import { z } from "zod";

import { useSay } from "@/lib/i18n-client";
import { presenceOf } from "@/lib/presences";

import { tableLabels } from "./table";

const Row = z.object({ id: z.string(), hour: z.string(), presence: z.string(), language: z.enum(["en", "fr"]), durationSec: z.number().nullable(), turns: z.number(), outcome: z.enum(["open", "closed", "over", "lines"]), lines: z.boolean() });
const Page = z.object({ rows: z.array(Row), total: z.number(), summary: z.object({ moments: z.number(), last24h: z.number(), averageSeconds: z.number(), linesShown: z.number() }) });
type RowT = z.infer<typeof Row>;

const keys = defineKeys("moments", { list: (query: DataTableQuery) => [query] });
const NONE: RowT[] = [];
const OUTCOMES = ["open", "closed", "over", "lines"] as const;

/** « m:ss », or a dash while the moment is open. */
const clock = (s: number | null) => (s === null ? "—" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

/** The moments as the organisation sees them: Krizaka UI's Stat grid on top, a server-side DataTable under it. Counts only — never what anyone said. */
export function MomentsConsole() {
  const { say, locale } = useSay();
  const [query, setQuery] = useState<DataTableQuery>({ sort: { column: "hour", direction: "descending" }, filters: {}, page: 1, pageSize: 25 });
  const list = useQuery({
    queryKey: keys.list(query),
    queryFn: ({ signal }) =>
      krizakaFetch("/api/admin/moments", {
        schema: Page,
        signal,
        query: { sort: query.sort?.column, dir: query.sort?.direction === "ascending" ? "asc" : "desc", page: query.page, size: query.pageSize, outcome: query.filters.outcome as string[] | undefined },
      }),
    placeholderData: keepPreviousData,
    meta: { list: true },
  });
  const when = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);
  const columns = useMemo<DataTableColumn<RowT>[]>(
    () => [
      { id: "hour", header: say("admin.moments.when"), sortable: true, card: "title", value: (m) => m.hour, cell: (m) => when.format(new Date(m.hour)) },
      { id: "presence", header: say("admin.moments.presence"), value: (m) => m.presence, cell: (m) => presenceOf(m.presence)?.name ?? m.presence },
      { id: "language", header: say("admin.members.language"), value: (m) => m.language, cell: (m) => m.language.toUpperCase() },
      { id: "durationSec", header: say("admin.moments.duration"), sortable: true, value: (m) => String(m.durationSec ?? ""), cell: (m) => clock(m.durationSec) },
      { id: "turns", header: say("admin.moments.turns"), sortable: true, value: (m) => String(m.turns), cell: (m) => m.turns },
      {
        id: "outcome",
        header: say("admin.moments.ended"),
        sortable: true,
        filter: "facet",
        options: OUTCOMES.map((o) => ({ value: o, label: say(`admin.moments.outcomes.${o}`) })),
        value: (m) => m.outcome,
        cell: (m) => (
          <Badge tone={m.outcome === "lines" ? "warning" : m.outcome === "open" ? "accent" : "neutral"} dot size="sm">
            {say(`admin.moments.outcomes.${m.outcome}`)}
          </Badge>
        ),
      },
    ],
    [say, when],
  );
  const labels = useMemo(() => tableLabels(say), [say]);
  const s = list.data?.summary;
  return (
    <div className="flex flex-col gap-6" data-testid="moments-console">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-extrabold text-fg">{say("admin.moments.title")}</h2>
        <p className="text-fg-secondary">{say("admin.moments.lead")}</p>
      </header>
      <StatGrid>
        <Stat label={say("admin.moments.kpiMoments")} value={s?.moments ?? "—"} hint={say("admin.moments.kpiLast24h", { count: s?.last24h ?? 0 })} />
        <Stat label={say("admin.moments.kpiAverage")} value={s ? clock(s.averageSeconds) : "—"} hint={say("admin.moments.kpiAverageHint")} />
        <Stat label={say("admin.moments.kpiLines")} value={s?.linesShown ?? "—"} hint={say("admin.moments.kpiLinesHint")} />
      </StatGrid>
      <DataTable
        caption={say("admin.moments.caption")}
        rows={list.data?.rows ?? NONE}
        columns={columns}
        getRowId={(m) => m.id}
        rowLabel={(m) => when.format(new Date(m.hour))}
        manual={{ sorting: true, filtering: true, pagination: true }}
        rowCount={list.data?.total}
        defaultPageSize={25}
        pageSizeOptions={[10, 25, 50]}
        defaultSort={{ column: "hour", direction: "descending" }}
        onStateChange={setQuery}
        loading={list.isPending}
        error={list.error ? say("errors.load") : undefined}
        labels={labels}
        toolbar={<DataTableFilters />}
      />
    </div>
  );
}
