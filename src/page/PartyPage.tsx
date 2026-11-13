import React, { useEffect, useState } from "react";
import PartyBranch from "../components/PartyBranch";
import PartyAssociationFormPage from "./PartyAssociationFormPage";
import PartyMemberDetailPage from "./PartyMemberDetailPage";
import PartyMemberFormPage from "./PartyMemberFormPage";
import { Association, AssociationMember, PartyMember, Resident, TaskItem } from "../types";
import { getStoredAssociations, saveStoredAssociations } from "../data/associationsData";
import { loadAssociationRecord, saveAssociationRecord } from "../utils/supabaseSync";
import { InlineNotice } from "../components/ui/ConfirmModal";
import {
  ROUTES,
  getPartyAssociationCreatePath,
  getPartyAssociationEditPath,
  getPartyMemberCreatePath,
  getPartyMemberDetailPath,
  getPartyMemberEditPath,
  navigate,
  parsePartyRoute,
  useCurrentLocation,
} from "../routes";

export interface PartyPageProps {
  partyMembers: PartyMember[];
  residents?: Resident[];
  associations?: Association[];
  onAssociationsChange?: (next: Association[]) => void;
  onCreateTask?: (task: TaskItem) => void;
  onNavigate?: (tab: string) => void;
  isDataLoading?: boolean;
  basePath?: string;
}

export default function PartyPage({
  partyMembers,
  residents = [],
  associations: externalAssocs,
  onAssociationsChange,
  onCreateTask,
  onNavigate,
  isDataLoading = false,
  basePath = ROUTES.DASHBOARD_PARTY,
}: PartyPageProps) {
  const location = useCurrentLocation();
  const routeMatch = parsePartyRoute(location.pathname, location.search);

  const [internalAssocs, setInternalAssocs] = useState<Association[]>(getStoredAssociations);
  const associations = externalAssocs ?? internalAssocs;

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = window.setTimeout(() => setSavedNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [savedNotice]);

  useEffect(() => {
    let active = true;
    loadAssociationRecord<Association[]>("associations").then((rows) => {
      if (active && Array.isArray(rows) && rows.length > 0) {
        if (onAssociationsChange) {
          onAssociationsChange(rows);
        } else {
          setInternalAssocs(rows);
          saveStoredAssociations(rows);
        }
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const saveAssocs = (next: Association[]) => {
    if (onAssociationsChange) {
      onAssociationsChange(next);
    } else {
      setInternalAssocs(next);
      saveStoredAssociations(next);
      saveAssociationRecord("associations", next);
    }
  };

  const handleAddAssociation = (newAssoc: Association) => {
    saveAssocs([...associations, newAssoc]);
  };

  const handleUpdateAssociation = (updated: Association) => {
    saveAssocs(associations.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleAddMember = (assocId: string, newMember: AssociationMember) => {
    const next = associations.map((assoc) => {
      if (assoc.id !== assocId) return assoc;
      const prev = assoc.members || [];
      const exists = prev.some((m) => m.cccd === newMember.cccd);
      return {
        ...assoc,
        members: exists
          ? prev.map((m) => (m.cccd === newMember.cccd ? newMember : m))
          : [...prev, newMember],
      };
    });
    saveAssocs(next);
  };

  const handleUpdateMember = (assocId: string, updatedMember: AssociationMember) => {
    const next = associations.map((assoc) => {
      if (assoc.id !== assocId) return assoc;
      return {
        ...assoc,
        members: (assoc.members || []).map((m) =>
          m.cccd === updatedMember.cccd ? updatedMember : m
        ),
      };
    });
    saveAssocs(next);
  };

  const handleRemoveMember = (assocId: string, memberCccd: string) => {
    const next = associations.map((assoc) => {
      if (assoc.id !== assocId) return assoc;
      return {
        ...assoc,
        members: (assoc.members || []).filter((m) => m.cccd !== memberCccd),
      };
    });
    saveAssocs(next);
  };

  if (routeMatch) {
    if (routeMatch.mode === "create_assoc") {
      return (
        <PartyAssociationFormPage
          mode="create"
          associations={associations}
          residents={residents}
          isDataLoading={isDataLoading}
          basePath={basePath}
          onAddAssociation={handleAddAssociation}
          onCancel={() => navigate(basePath)}
          onSaved={(saved) => {
            setSavedNotice(`Đã thành lập chi hội "${saved.name}" (Mã: ${saved.id}) thành công!`);
            navigate(basePath);
          }}
        />
      );
    }

    if (routeMatch.mode === "edit_assoc") {
      return (
        <PartyAssociationFormPage
          mode="edit"
          assocId={routeMatch.assocId}
          associations={associations}
          residents={residents}
          isDataLoading={isDataLoading}
          basePath={basePath}
          onUpdateAssociation={handleUpdateAssociation}
          onCancel={() => navigate(basePath)}
          onSaved={(saved) => {
            setSavedNotice(`Đã cập nhật thông tin chi hội "${saved.name}" thành công!`);
            navigate(basePath);
          }}
        />
      );
    }

    if (routeMatch.mode === "member_new") {
      return (
        <PartyMemberFormPage
          mode="create"
          assocId={routeMatch.assocId}
          associations={associations}
          residents={residents}
          isDataLoading={isDataLoading}
          basePath={basePath}
          onAddMember={handleAddMember}
          onUpdateAssociations={saveAssocs}
          onCancel={() => navigate(basePath)}
          onSaved={(saved, assoc) => {
            setSavedNotice(`Đã bổ nhiệm hội viên "${saved.fullName}" vào "${assoc.name}" thành công!`);
            navigate(getPartyMemberDetailPath(saved.cccd, assoc.id, basePath));
          }}
        />
      );
    }

    if (routeMatch.mode === "member_edit") {
      return (
        <PartyMemberFormPage
          mode="edit"
          cccd={routeMatch.cccd}
          assocId={routeMatch.assocId}
          associations={associations}
          residents={residents}
          isDataLoading={isDataLoading}
          basePath={basePath}
          onUpdateMember={handleUpdateMember}
          onUpdateAssociations={saveAssocs}
          onCancel={() => navigate(basePath)}
          onSaved={(saved, assoc) => {
            setSavedNotice(`Đã cập nhật hồ sơ hội viên "${saved.fullName}" thành công!`);
            navigate(getPartyMemberDetailPath(saved.cccd, assoc.id, basePath));
          }}
        />
      );
    }

    if (routeMatch.mode === "member_detail") {
      return (
        <PartyMemberDetailPage
          cccd={routeMatch.cccd}
          assocId={routeMatch.assocId}
          associations={associations}
          residents={residents}
          partyMembers={partyMembers}
          isDataLoading={isDataLoading}
          basePath={basePath}
          onBack={() => navigate(basePath)}
          onEdit={(m, a) => navigate(getPartyMemberEditPath(m.cccd, a.id, basePath))}
          onRemoveMember={(assocId, cccd, name) => {
            handleRemoveMember(assocId, cccd);
            setSavedNotice(`Đã xóa hội viên "${name}" khỏi chi hội.`);
            navigate(basePath);
          }}
          onUpdateAssociations={saveAssocs}
        />
      );
    }
  }

  return (
    <div className="space-y-4">
      {savedNotice && (
        <InlineNotice
          type="success"
          message={savedNotice}
          onDismiss={() => setSavedNotice(null)}
        />
      )}
      <PartyBranch
        partyMembers={partyMembers}
        residents={residents}
        associations={associations}
        onAssociationsChange={saveAssocs}
        onCreateTask={onCreateTask}
        onNavigate={onNavigate}
        basePath={basePath}
        onOpenCreateAssoc={() => navigate(getPartyAssociationCreatePath(basePath))}
        onOpenEditAssoc={(assoc) => navigate(getPartyAssociationEditPath(assoc.id, basePath))}
        onOpenAddMember={(assoc) => navigate(getPartyMemberCreatePath(assoc.id, basePath))}
        onOpenMemberDetail={(member, assoc) =>
          navigate(getPartyMemberDetailPath(member.cccd, assoc?.id, basePath))
        }
        onOpenEditMember={(member, assoc) =>
          navigate(getPartyMemberEditPath(member.cccd, assoc?.id, basePath))
        }
      />
    </div>
  );
}
