import React from "react";
import SettingsAndPermissions from "../components/SettingsAndPermissions";

export interface SettingsPageProps {
  pendingRegistrations?: any[];
  onApproveRegistration?: (reg: any) => void;
  onRejectRegistration?: (id: string) => void;
  residentPermissions?: Record<string, boolean>;
  onTogglePermission?: (tabKey: string) => void;
  currentUser?: any;
}

export default function SettingsPage(props: SettingsPageProps) {
  return (
    <SettingsAndPermissions 
      pendingRegistrations={props.pendingRegistrations || []}
      onApproveRegistration={props.onApproveRegistration || (() => {})}
      onRejectRegistration={props.onRejectRegistration || (() => {})}
      residentPermissions={props.residentPermissions || {}}
      onTogglePermission={props.onTogglePermission || (() => {})}
      currentUser={props.currentUser || null}
    />
  );
}
