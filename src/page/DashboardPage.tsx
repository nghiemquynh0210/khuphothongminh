import React from "react";
import Dashboard from "../components/Dashboard";
import {
  Resident,
  Household,
  Business,
  FieldReport,
  AdministrativeForm,
  ActiveTab,
  TaskItem,
  FundContribution,
  FundExpenditure,
} from "../types";

export interface DashboardPageProps {
  residents: Resident[];
  households: Household[];
  businesses: Business[];
  reports: FieldReport[];
  forms?: AdministrativeForm[];
  tasks?: TaskItem[];
  fundContributions?: FundContribution[];
  fundExpenditures?: FundExpenditure[];
  welfareCount?: number;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser?: any;
}

export default function DashboardPage(props: DashboardPageProps) {
  return <Dashboard {...props} />;
}

