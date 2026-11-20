import React from "react";
import SocialWelfare from "../components/SocialWelfare";
import { WelfareRecipient, Resident, FundExpenditure } from "../types";

export interface WelfarePageProps {
  recipients: WelfareRecipient[];
  residents: Resident[];
  onUpdateStatus: (id: string, status: any) => void;
  onAddRecipient: (recipient: any) => void;
  onUpdateRecipient?: (updatedRec: WelfareRecipient) => void;
  onDeleteRecipient: (id: string) => void;
  onRecordFundExpenditure?: (exp: FundExpenditure) => void;
}

export default function WelfarePage(props: WelfarePageProps) {
  return <SocialWelfare {...props} />;
}

