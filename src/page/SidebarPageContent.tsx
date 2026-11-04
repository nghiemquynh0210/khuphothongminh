import React from "react";
import Sidebar from "../components/Sidebar";
import { ActiveTab } from "../types";

export interface SidebarPageContentProps {
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  currentUser?: {
    fullName: string;
    role: "canbo" | "nguoidan";
  } | null;
  onLogout?: () => void;
  onSwitchRole?: () => void;
  residentPermissions?: Record<string, boolean>;
}

export default function SidebarPageContent(props: SidebarPageContentProps) {
  return (
    <Sidebar 
      activeTab={props.activeTab || "dashboard"} 
      setActiveTab={props.setActiveTab || (() => {})} 
      currentUser={props.currentUser || null} 
      onLogout={props.onLogout || (() => {})} 
      onSwitchRole={props.onSwitchRole} 
      residentPermissions={props.residentPermissions || {}} 
    />
  );
}
