import React from "react";
import AdministrativeForms from "../components/AdministrativeForms";

export interface FormsPageProps {
  forms?: any[];
  onAddForm?: (newForm: any) => void;
  onUpdateForm?: (updatedForm: any) => void;
  onDeleteForm?: (formId: string) => void;
  currentUser?: any;
}

export default function FormsPage(props: FormsPageProps) {
  return <AdministrativeForms {...props} />;
}

