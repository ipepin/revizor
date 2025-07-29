// src/sections/DefectsRecommendationsSection.tsx

import React, {
  useState,
  useEffect,
  ChangeEvent,
  useContext,
} from "react";
import axios from "axios";
import { RevisionFormContext } from "../context/RevisionFormContext";

type Defect = {
  id: number;
  description: string;
  standard: string;
  article: string;
};

export default function DefectsRecommendationsSection() {
  const { form, setForm } = useContext(RevisionFormContext);

  const [catalog, setCatalog] = useState<Defect[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [newDefect, setNewDefect] = useState<Omit<Defect, "id">>({
    description: "",
    standard: "",
    article: "",
  });
  const [toDelete, setToDelete] = useState<Defect | null>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  function loadCatalog() {
    axios
      .get<Defect[]>("/defects")
      .then((res) => setCatalog(res.data))
      .catch(() => alert("Chyba při načítání katalogu závad"));
  }

function addDefectToList(d: Defect) {
  setForm((f) => ({
    ...f,
    defects: [...f.defects, d], // přidáme rovnou celý objekt
  }));
  setShowPicker(false);
}

function onChangeTextarea(e: ChangeEvent<HTMLTextAreaElement>) {
  const lines = e.target.value
    .split("\n")
    .map((l) => l.replace(/^\d+\)\s*/, "").trim())
    .filter((l) => l.length > 0);

  // Převedeme každý řádek na objekt Defect (např. bez standardu a článku)
  setForm((f) => ({
    ...f,
    defects: lines.map((desc) => ({
      description: desc,
      standard: "",
      article: "",
    })),
  }));
}
  function onChangeCatalog(idx: number, field: keyof Omit<Defect, "id">, val: string) {
    setCatalog((c) =>
      c.map((d, i) => (i === idx ? { ...d, [field]: val } : d))
    );
  }

  function saveCatalogItem(idx: number) {
    const d = catalog[idx];
    axios
      .put(`/defects/${d.id}`, {
        description: d.description,
        standard: d.standard,
        article: d.article,
      })
      .then(() => loadCatalog())
      .catch(() => alert("Chyba při ukládání změn"));
  }

  function confirmDelete(d: Defect) {
    setToDelete(d);
  }

  function deleteCatalogItem() {
    if (!toDelete) return;
    axios
      .delete(`/defects/${toDelete.id}`)
      .then(() => {
        setToDelete(null);
        loadCatalog();
      })
      .catch(() => {
        setToDelete(null);
        alert("Chyba při mazání položky");
      });
  }

  function createCatalogItem() {
    axios
      .post("/defects", newDefect)
      .then(() => {
        setNewDefect({ description: "", standard: "", article: "" });
        loadCatalog();
      })
      .catch(() => alert("Chyba při vytváření položky"));
  }

  return (
    <section className="w-full bg-white p-4 rounded shadow mb-8">
      <h2 className="text-lg font-semibold mb-2">Závady a doporučení</h2>
      <textarea
        className="w-full p-2 border rounded text-sm mb-4"
        rows={6}
        placeholder="Každá závada na samostatném řádku"
        value={(form.defects || []).map((d, i) => `${i + 1}) ${d}`).join("\n")}
        onChange={onChangeTextarea}
      />
      <div className="flex gap-2 mb-4">
        <button
          className="bg-blue-600 text-white py-1 px-3 rounded text-sm"
          onClick={() => setShowPicker(true)}
        >
          ➕ Přidat závadu
        </button>
        <button
          className="bg-gray-600 text-white py-1 px-3 rounded text-sm"
          onClick={() => setShowEditor(true)}
        >
          ⚙️ Editor katalogu
        </button>
      </div>

      {showPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Vyberte závadu</h3>
            <div className="overflow-auto max-h-64 mb-4">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Závada</th>
                    <th className="p-2 text-left">Norma</th>
                    <th className="p-2 text-left">Článek</th>
                    <th className="p-2 text-center">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="p-2">{d.description}</td>
                      <td className="p-2">{d.standard}</td>
                      <td className="p-2">{d.article}</td>
                      <td className="p-2 text-center">
                        <button
                          className="text-green-600 px-2"
                          onClick={() => addDefectToList(d)}
                        >
                          ✔️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button
                className="bg-gray-300 py-1 px-3 rounded text-sm"
                onClick={() => setShowPicker(false)}
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-3xl overflow-auto max-h-[80vh]">
            <h3 className="text-lg font-semibold mb-4">
              Editor katalogu závad
            </h3>

            <table className="w-full text-sm border mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Závada</th>
                  <th className="p-2 text-left">Norma</th>
                  <th className="p-2 text-left">Článek</th>
                  <th className="p-2 text-center">Akce</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((d, idx) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-2">
                      <input
                        className="w-full border rounded p-1 text-sm"
                        value={d.description}
                        onChange={(e) =>
                          onChangeCatalog(idx, "description", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="w-full border rounded p-1 text-sm"
                        value={d.standard}
                        onChange={(e) =>
                          onChangeCatalog(idx, "standard", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="w-full border rounded p-1 text-sm"
                        value={d.article}
                        onChange={(e) =>
                          onChangeCatalog(idx, "article", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2 text-center whitespace-nowrap">
                      <button
                        className="text-green-600 px-2"
                        onClick={() => saveCatalogItem(idx)}
                      >
                        💾
                      </button>
                      <button
                        className="text-red-600 px-2"
                        onClick={() => confirmDelete(d)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <input
                placeholder="Závada"
                className="border rounded p-2 text-sm"
                value={newDefect.description}
                onChange={(e) =>
                  setNewDefect((nd) => ({
                    ...nd,
                    description: e.target.value,
                  }))
                }
              />
              <input
                placeholder="Norma"
                className="border rounded p-2 text-sm"
                value={newDefect.standard}
                onChange={(e) =>
                  setNewDefect((nd) => ({ ...nd, standard: e.target.value }))
                }
              />
              <input
                placeholder="Článek"
                className="border rounded p-2 text-sm"
                value={newDefect.article}
                onChange={(e) =>
                  setNewDefect((nd) => ({ ...nd, article: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end mb-2">
              <button
                className="bg-blue-600 text-white py-1 px-3 rounded text-sm"
                onClick={createCatalogItem}
              >
                ➕ Přidat položku
              </button>
            </div>

            <div className="flex justify-end">
              <button
                className="bg-gray-300 py-1 px-3 rounded text-sm"
                onClick={() => setShowEditor(false)}
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">
              Opravdu smazat položku?
            </h3>
            <p className="mb-4">
              {toDelete.description} ({toDelete.standard}, čl. {toDelete.article})
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 py-1 px-3 rounded text-sm"
                onClick={() => setToDelete(null)}
              >
                Zrušit
              </button>
              <button
                className="bg-red-600 text-white py-1 px-3 rounded text-sm"
                onClick={deleteCatalogItem}
              >
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
