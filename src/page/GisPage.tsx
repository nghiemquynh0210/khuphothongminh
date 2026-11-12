import React from "react";
import GisMap from "../components/GisMap";
import { Household, Resident, Business, FieldReport, TargetGisItem } from "../types";

export interface GisPageProps {
  households: Household[];
  onUpdateHouseholds: React.Dispatch<React.SetStateAction<Household[]>>;
  residents: Resident[];
  onUpdateResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
  businesses: Business[];
  onUpdateBusinesses: React.Dispatch<React.SetStateAction<Business[]>>;
  reports?: FieldReport[];
  targetGisItem: TargetGisItem | null;
  onClearTargetGisItem: () => void;
  onNavigateToReport?: (reportId?: string) => void;
  readOnly?: boolean;
}

export default function GisPage(props: GisPageProps) {
  return <GisMap {...props} />;
}
