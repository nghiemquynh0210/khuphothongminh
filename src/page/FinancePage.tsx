import React from "react";
import NeighborhoodFunds from "../components/NeighborhoodFunds";
import { FundContribution, Household } from "../types";

export interface FinancePageProps {
  contributions: FundContribution[];
  households: Household[];
  onAddContribution: (contribution: FundContribution) => void;
  onUpdateContributionStatus: (id: string, status: "Đã nộp" | "Chưa nộp", paidAt?: string) => void;
}

export default function FinancePage(props: FinancePageProps) {
  return <NeighborhoodFunds {...props} />;
}

