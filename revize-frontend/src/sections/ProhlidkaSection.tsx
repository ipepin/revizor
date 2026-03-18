import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RevisionFormContext } from "../context/RevisionFormContext";
import api from "../api/axios";
import RichTextEditor from "../components/RichTextEditor";

const inspectionTasks = [
  "Způsob ochrany před úrazem elektrickým proudem (IEC 60364-4-41)",
  "Protipožární přepážky a ochrana před šířením ohně (IEC 60364-4-42, 5-52:2009)",
  "Volba vodičů dle zatížitelnosti a úbytku napětí (IEC 60364-4-43, 5-52:2009)",
  "Seřízení a koordinace ochranných přístrojů (IEC 60364-5-53:2001)",
  "Přepěťová ochrana SPD (IEC 60364-5-53:2001, AMD2:2015)",
  "Odpojovací a spínací přístroje (IEC 60364-5-53:2001)",
  "Vnější vlivy a mechanické namáhání (IEC 60364-4-42:2010, 5-51:2005, 5-52:2009)",
  "Označení vodičů, výstražné nápisy a schémata (IEC 60364-5-51:2005)",
  "Označení obvodů, svorek atd. (IEC 60364-5-51:2005)",
  "Zakončování kabelů a vodičů (IEC 60364-5-52:2009)",
];

type InspectionTemplate = {
  id: number;
  label: string;
  body: string;
  scope: "EI" | "LPS";
  user_id?: number | null;
  is_default?: boolean;
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToHtml(value: string) {
  const lines = String(value || "").split(/\r?\n/);
  if (!lines.length) return "";
  return lines
    .map((line) => {
      const safe = escapeHtml(line.trim());
      return safe ? `<p>${safe}</p>` : "<p><br></p>";
    })
    .join("");
}

function normalizeTemplateBody(body?: string) {
  const value = String(body || "").trim();
  if (!value) return "";
  return /<[a-z][\s\S]*>/i.test(value) ? value : textToHtml(value);
}

export default function ProhlidkaSection() {
  const { form, setForm } = useContext(RevisionFormContext);
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const toggleTask = (task: string) => {
    setForm((f) => {
      const current = f.performedTasks;
      const updated = current.includes(task)
        ? current.filter((t) => t !== task)
        : [...current, task];
      return { ...f, performedTasks: updated };
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find((t) => String(t.id) === templateId);
    const desc = normalizeTemplateBody(tpl?.body);
    setForm((f) => ({
      ...f,
      inspectionTemplate: templateId,
      inspectionDescription: desc,
    }));
    setSelectedTemplateId(templateId);
  };

  const onDescriptionChange = (html: string) => {
    setForm((f) => ({ ...f, inspectionDescription: html }));
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    setTemplateError("");
    try {
      const res = await api.get<InspectionTemplate[]>("/inspection-templates", {
        params: { scope: "EI" },
      });
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTemplateError("Nepodařilo se načíst vzorové texty.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!templates.length || selectedTemplateId) return;
    const current = String(form.inspectionTemplate || "").trim();
    if (!current) return;

    const byId = templates.find((t) => String(t.id) === current);
    if (byId) {
      setSelectedTemplateId(String(byId.id));
      return;
    }

    const byLabel = templates.find((t) => t.label === current);
    if (byLabel) {
      setSelectedTemplateId(String(byLabel.id));
      setForm((f) => ({ ...f, inspectionTemplate: String(byLabel.id) }));
    }
  }, [templates, selectedTemplateId, form.inspectionTemplate, setForm]);

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <div data-guide-id="pr-tasks">
        <h2 className="mb-2 text-lg font-semibold text-blue-800">Provedené úkony</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {inspectionTasks.map((task) => (
            <label key={task} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={form.performedTasks.includes(task)}
                onChange={() => toggleTask(task)}
                className="accent-blue-600"
              />
              <span>{task}</span>
            </label>
          ))}
        </div>
      </div>

      <div data-guide-id="pr-description">
        <h2 className="mb-2 text-lg font-semibold text-blue-800">Popis revidovaného objektu</h2>

        <div className="mb-2">
          <label className="mb-1 block font-medium">Vyber vzorový text:</label>
          <select
            value={selectedTemplateId || form.inspectionTemplate || ""}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full rounded border p-2 text-sm"
          >
            <option value="">-- Vyberte možnost --</option>
            {templates.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.label}
              </option>
            ))}
          </select>
          {loadingTemplates && <div className="mt-1 text-xs text-gray-500">Načítám šablony…</div>}
          {templateError && <div className="mt-1 text-xs text-red-600">{templateError}</div>}
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
            onClick={() => navigate("/inspection-templates")}
          >
            Otevřít editor vzorových textů
          </button>
        </div>

        <RichTextEditor
          value={form.inspectionDescription || ""}
          onChange={onDescriptionChange}
          placeholder="Popis revidovaného objektu…"
          minHeightClassName="min-h-[260px]"
        />
      </div>
    </div>
  );
}
