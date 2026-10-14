"use client";

import { defineKeys, keepPreviousData, krizakaFetch, useQuery } from "@krizaka/query";
import { Badge } from "@krizaka/ui/badge";
import { DataTable, type DataTableColumn, DataTableFilters, type DataTableQuery } from "@krizaka/ui/data-table";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useSay } from "@/lib/i18n-client";

import { tableLabels } from "./table";

interface MemberRow {
  id: string;
  email: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  role: "MEMBER" | "ADMIN";
  locale: "en" | "fr";
  createdAt: string;
  lastSeenAt: string | null;
}

const keys = defineKeys("members", { list: (query: DataTableQuery) => [query] });
const NONE: MemberRow[] = [];

/** The organisation's members, on the server: search, status filter, sort and pages go to `/api/admin/members`. */
export function MembersTable() {
  const { say, locale } = useSay();
  const [query, setQuery] = useState<DataTableQuery>({ sort: { column: "createdAt", direction: "descending" }, filters: {}, page: 1, pageSize: 25 });
  const list = useQuery({
    queryKey: keys.list(query),
    queryFn: ({ signal }) =>
      krizakaFetch("/api/admin/members", {
        signal,
        query: {
          sort: query.sort?.column,
          dir: query.sort?.direction === "ascending" ? "asc" : "desc",
          page: query.page,
          size: query.pageSize,
          search: typeof query.filters.name === "string" ? query.filters.name : undefined,
          status: query.filters.status as string[] | undefined,
        },
      }) as Promise<{ rows: MemberRow[]; total: number }>,
    placeholderData: keepPreviousData,
    meta: { list: true },
  });
  const date = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);
  const columns = useMemo<DataTableColumn<MemberRow>[]>(
    () => [
      {
        id: "name",
        header: say("admin.members.name"),
        sortable: true,
        filter: "text",
        card: "title",
        cell: (m) => (
          <Link href={`/${locale}/admin/members/${m.id}`} className="font-medium text-fg-accent underline-offset-4 hover:underline" aria-label={say("admin.members.open", { name: m.name })}>
            {m.name}
          </Link>
        ),
      },
      { id: "email", header: say("admin.members.email") },
      {
        id: "status",
        header: say("admin.members.status"),
        sortable: true,
        filter: "facet",
        options: (["ACTIVE", "PAUSED"] as const).map((s) => ({ value: s, label: say(`admin.statuses.${s}`) })),
        value: (m) => m.status,
        cell: (m) => (
          <Badge tone={m.status === "ACTIVE" ? "success" : "neutral"} dot size="sm">
            {say(`admin.statuses.${m.status}`)}
          </Badge>
        ),
      },
      { id: "role", header: say("admin.members.role"), value: (m) => m.role, cell: (m) => say(`admin.roles.${m.role}`) },
      { id: "locale", header: say("admin.members.language"), value: (m) => m.locale, cell: (m) => m.locale.toUpperCase() },
      { id: "createdAt", header: say("admin.members.joined"), sortable: true, value: (m) => m.createdAt, cell: (m) => date.format(new Date(m.createdAt)) },
      { id: "lastSeenAt", header: say("admin.members.lastSeen"), sortable: true, value: (m) => m.lastSeenAt ?? "", cell: (m) => (m.lastSeenAt ? date.format(new Date(m.lastSeenAt)) : say("admin.members.never")) },
    ],
    [say, locale, date],
  );
  const labels = useMemo(() => tableLabels(say), [say]);
  return (
    <DataTable
      caption={say("admin.members.caption")}
      rows={list.data?.rows ?? NONE}
      columns={columns}
      getRowId={(m) => m.id}
      rowLabel={(m) => m.name}
      manual={{ sorting: true, filtering: true, pagination: true }}
      rowCount={list.data?.total}
      defaultPageSize={25}
      pageSizeOptions={[10, 25, 50]}
      defaultSort={{ column: "createdAt", direction: "descending" }}
      onStateChange={setQuery}
      loading={list.isPending}
      error={list.error ? say("errors.load") : undefined}
      labels={labels}
      toolbar={<DataTableFilters />}
    />
  );
}
