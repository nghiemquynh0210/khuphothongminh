import React from "react";
import CitizenLandingPage from "../components/CitizenLandingPage";
import { initialAdministrativeForms } from "../mockForms";

export interface CitizenSubViewContentProps {
  reports?: any[];
  forms?: any[];
  events?: any[];
  onAddReport?: (newReport: any) => void;
  onNavigateToTab?: (tab: any) => void;
  onOpenStaffLogin?: () => void;
  currentUser?: any;
}

export default function CitizenSubViewContent(props: CitizenSubViewContentProps) {
  return (
    <CitizenLandingPage 
      reports={props.reports || []}
      forms={props.forms || initialAdministrativeForms}
      events={props.events || []}
      onAddReport={props.onAddReport || (() => {})}
      onNavigateToTab={props.onNavigateToTab || (() => {})}
      onOpenStaffLogin={props.onOpenStaffLogin}
    />
  );
}
