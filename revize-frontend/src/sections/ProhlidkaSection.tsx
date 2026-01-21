// src/sections/ProhlidkaSection.tsx

import React, { useContext, ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RevisionFormContext } from "../context/RevisionFormContext";
import api from "../api/axios";

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

export default function ProhlidkaSection() {
  const { form, setForm } = useContext(RevisionFormContext);
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Přepínání checkboxů úkonů
  const toggleTask = (task: string) => {
    setForm((f) => {
      const current = f.performedTasks;
      const updated = current.includes(task)
        ? current.filter((t) => t !== task)
        : [...current, task];
      return { ...f, performedTasks: updated };
    });
  };

  // Výběr šablony popisu
  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find((t) => String(t.id) === templateId);
    const desc = tpl?.body || "";
    setForm((f) => ({
      ...f,
      inspectionTemplate: templateId,
      inspectionDescription: desc,
    }));
    setSelectedTemplateId(templateId);
  };

  // Ruční změna popisu
  const onDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, inspectionDescription: val }));
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    setTemplateError("");
    try {
      const res = await api.get<InspectionTemplate[]>("/inspection-templates", {
        params: { scope: "EI" },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      setTemplates(rows);
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
    if (!templates.length) return;
    if (selectedTemplateId) return;
    const current = (form.inspectionTemplate || "").toString();
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
  }, [templates, selectedTemplateId, form.inspectionTemplate]);

  return (
    <div className="space-y-4 text-sm text-gray-800">
      {/* Provedené úkony */}
      <div data-guide-id="pr-tasks">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Provedené úkony</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {inspectionTasks.map((task) => (
            <label key={task} className="flex gap-2 items-start">
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

      {/* Popis revidovaného objektu */}
      <div data-guide-id="pr-description">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Popis revidovaného objektu</h2>

        <div className="mb-2">
          <label className="font-medium block mb-1">Vyber vzorový text:</label>
          <select
            value={selectedTemplateId || form.inspectionTemplate || ""}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="border p-2 rounded w-full text-sm"
          >
            <option value="">-- Vyberte možnost --</option>
            {templates.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.label}
              </option>
            ))}
          </select>
          {loadingTemplates && <div className="text-xs text-gray-500 mt-1">Načítám šablony…</div>}
          {templateError && <div className="text-xs text-red-600 mt-1">{templateError}</div>}
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
            onClick={() => navigate("/snippets")}
          >
            Otevřít editor rychlých textů
          </button>
        </div>

        <textarea
          rows={10}
          className="w-full border rounded p-2 text-sm"
          value={form.inspectionDescription}
          onChange={onDescriptionChange}
          placeholder="Popis revidovaného objektu..."
        />
      </div>
    </div>
  );
}
