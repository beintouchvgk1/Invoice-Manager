"use client";
import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { GroupModal } from "@/components/Group/GroupModal";
import { useGroups } from "@/hooks/useGroups";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { fI } from "@/lib/calc";

export default function GroupsPage() {
  const { groups, loading, refresh } = useGroups();
  const { can } = useCurrentUser();
  const [editing, setEditing] = useState<string | null | undefined>(undefined);

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
                {groups.length ? (
                  groups.map((g) => (
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
