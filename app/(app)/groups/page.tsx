"use client";
import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { GroupModal } from "@/components/Group/GroupModal";
import { Pagination } from "@/components/Common/Pagination";
import { useGroups } from "@/hooks/useGroups";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useListControls } from "@/hooks/useListControls";
import { fI } from "@/lib/calc";
import type { Group } from "@/lib/types";

export default function GroupsPage() {
  const { groups, loading, refresh } = useGroups();
  const { can } = useCurrentUser();
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const { search, setSearch, page, setPage, limit, setLimit, paged, total, totalPages } = useListControls(
    groups,
    (g: Group) => g.name
  );

  return (
    <>
      <Header
        title="Groups"
        actions={can("groups.create") && <button className="btn bp sm" onClick={() => setEditing(null)}>+ New Group</button>}
      />
      <div id="ct">
        {loading ? (
          <SkeletonTable columns={4} rows={6} />
        ) : (
          <>
          <div className="list-toolbar">
            <input
              className="list-search"
              placeholder="Search by group name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Group Name</th>
                  <th>Members</th>
                  <th style={{ textAlign: "right" }}>Outstanding</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length ? (
                  paged.map((g) => (
                    <tr key={g.name}>
                      <td><strong>{g.name}</strong></td>
                      <td>{g.memberCount} client(s)</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: g.outstanding > 0 ? "#dc2626" : "#059669" }}>
                        {g.outstanding > 0 ? `Rs. ${fI(g.outstanding)}` : "Clear"}
                      </td>
                      <td>
                        <div className="ac">
                          {can("groups.edit") && (
                            <button className="btn sm bp" onClick={() => setEditing(g.name)}>Edit / Members</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="em">No groups yet. Click &quot;+ New Group&quot; to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
          </>
        )}
      </div>

      {editing !== undefined && (
        <GroupModal
          groupName={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            refresh();
          }}
        />
      )}
    </>
  );
}
