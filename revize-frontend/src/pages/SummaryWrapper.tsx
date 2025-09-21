import { useParams } from "react-router-dom";
import { RevisionFormProvider } from "../context/RevisionFormContext";
import SummaryPage from "./SummaryPage";

export default function SummaryWrapper() {
  const { revId } = useParams();
  const idNum = Number(revId);
  return (
    <RevisionFormProvider revId={idNum}>
      <SummaryPage />
    </RevisionFormProvider>
  );
}