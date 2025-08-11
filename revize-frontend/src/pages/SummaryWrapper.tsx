// src/pages/SummaryWrapper.tsx
import React from "react";
import { useParams } from "react-router-dom";
import { RevisionFormProvider } from "../context/RevisionFormContext";
import SummaryPage from "./SummaryPage";

const SummaryWrapper: React.FC = () => {
  const { revId } = useParams<{ revId: string }>();
  return (
    <RevisionFormProvider revId={Number(revId)}>
      <SummaryPage />
    </RevisionFormProvider>
  );
};

export default SummaryWrapper;
