import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
} from "react";
import axios from "axios";
import { useRevisionForm, Board, Komponenta } from "../context/RevisionFormContext";
import ComponentRow from "./ComponentRow";

axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const polesOptions = ["1", "1+N", "3", "3+N"];
const dimenzeOptions: string[] = [
  ...["CYKY", "AYKY"].flatMap((t) =>
    ["2×1,5","3×1,5","5×1,5","2×2,5","3×2,5","5×2,5","3×4","3×6","3×10","3×16","3×25","3×35"]
      .map((p) => `${t} ${p}`)
  ),
  ...["1,5","2,5","4","6","10","16","25","35"].map((p) => `CYA ${p}`),
];

export default function RozvadecePanel() {
  const { form, setForm } = useRevisionForm();
  const boards = form.boards;

  // --- Rozvaděče ---
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(
    boards.length > 0 ? boards[0].id : null
  );
  const [showBoardDialog, setShowBoardDialog] = useState(false);
  const [newBoard, setNewBoard] = useState<Omit<Board,"id"|"komponenty">>({
    name:"", vyrobce:"", typ:"", vyrobniCislo:"",
    napeti:"", proud:"", ip:"", odpor:"", umisteni:""
  });
  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || null;

  // --- Editace vlastností rozvaděče ---
  const [editingBoard, setEditingBoard] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // --- Komponenty ---
  const [showCompDialog, setShowCompDialog] = useState(false);
  const defaultComp: Komponenta = {
    id:0,
    nazevId:"", nazev:"",
    popisId:"", popis:"",
    typId:"", typ:"",
    poles:"", dimenze:"", riso:"", ochrana:"", poznamka:""
  };
  const [newComp, setNewComp] = useState<Komponenta>({ ...defaultComp });
  const [editingCompId, setEditingCompId] = useState<number | null>(null);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  // --- Katalog ---
  const [types, setTypes] = useState<{id:number,name:string}[]>([]);
  const [manufacturers, setManufacturers] = useState<{id:number,name:string}[]>([]);
  const [models, setModels] = useState<{id:number,name:string}[]>([]);

  useEffect(() => {
    axios.get("/catalog/types").then(r=>setTypes(r.data)).catch(()=>{});
  }, []);
  useEffect(() => {
    if (newComp.nazevId) {
      axios.get("/catalog/manufacturers", { params:{ type_id:newComp.nazevId } })
        .then(r=>setManufacturers(r.data))
        .catch(()=>{});
    } else setManufacturers([]);
    setNewComp(c=>({ ...c, popisId:"", popis:"", typId:"", typ:"" }));
    setModels([]);
  }, [newComp.nazevId]);
  useEffect(() => {
    if (newComp.popisId) {
      axios.get("/catalog/models", { params:{ manufacturer_id:newComp.popisId } })
        .then(r=>setModels(r.data))
        .catch(()=>{});
    } else setModels([]);
    setNewComp(c=>({ ...c, typId:"", typ:"" }));
  }, [newComp.popisId]);

  // --- Handlery ---
  function handleAddBoard() {
    if (!newBoard.name.trim()) return alert("Název povinný");
    const id = Date.now();
    setForm(f=>({ ...f, boards:[...f.boards, { id, komponenty:[], ...newBoard }] }));
    setNewBoard({ name:"",vyrobce:"",typ:"",vyrobniCislo:"",napeti:"",proud:"",ip:"",odpor:"",umisteni:"" });
    setShowBoardDialog(false);
    setSelectedBoardId(id);
  }

  function handleAddComponent() {
    if (!selectedBoardId) return;
    const comp:Komponenta = { ...newComp, id:Date.now() };
    setForm(f=>({
      ...f,
      boards:f.boards.map(b=> b.id===selectedBoardId
        ? { ...b, komponenty:[...b.komponenty, comp] }
        : b
      )
    }));
    setNewComp({ ...defaultComp });
    setShowCompDialog(false);
  }

  function handleCopyComponent(cId:number) {
    if (!selectedBoard) return;
    const orig = selectedBoard.komponenty.find(x=>x.id===cId);
    if (!orig) return;
    const copy = { ...orig, id:Date.now() };
    setForm(f=>({
      ...f,
      boards:f.boards.map(b=> b.id===selectedBoardId
        ? { ...b, komponenty:[...b.komponenty,copy] }
        : b
      )
    }));
  }

  function handleDeleteComponent(cId:number) {
    setForm(f=>({
      ...f,
      boards:f.boards.map(b=> b.id===selectedBoardId
        ? { ...b, komponenty:b.komponenty.filter(x=> x.id!==cId) }
        : b
      )
    }));
    if (selectedCompId===cId) setSelectedCompId(null);
    if (editingCompId===cId) setEditingCompId(null);
  }

  function updateCompField(cId:number,field:keyof Komponenta,val:string) {
    setForm(f=>({
      ...f,
      boards:f.boards.map(b=> b.id===selectedBoardId
        ? {
            ...b,
            komponenty:b.komponenty.map(x=> x.id===cId
              ? { ...x, [field]:val }
              : x
            )
          }
        : b
      )
    }));
  }

  function renderCell(c:Komponenta,field:keyof Komponenta,isEd:boolean) {
    const val = c[field] as string;
    if (!isEd) {
      return <span onDoubleClick={()=>setEditingCompId(c.id)}>{val}</span>;
    }
    if (field==="poles"||field==="dimenze") {
      const opts = field==="poles"?polesOptions:dimenzeOptions;
      return (
        <select
          className="w-full p-1 border rounded"
          value={val}
          onChange={e=> updateCompField(c.id,field,e.target.value) }
        >
          {opts.map(o=> <option key={o} value={o}>{o}</option> )}
        </select>
      );
    }
    return (
      <input
        className="w-full p-1 border rounded text-sm"
        value={val}
        onChange={e=> updateCompField(c.id,field,e.target.value) }
      />
    );
  }

  return (
    <section className="bg-white p-4 rounded shadow mb-8">
      {/* Seznam a dialog rozvaděčů */}
      <div className="flex gap-6 mb-4">
        <aside className="w-1/4">
          {/* Nadpis */}
          <h2 className="text-lg font-semibold mb-2">Rozvaděče:</h2>

          {/* Rámeček kolem seznamu */}
          <div className="border rounded p-2 mb-4">
            <ul className="space-y-1">
              {boards.map((b) => (
                <li
                  key={b.id}
                  onClick={() => {
                    setSelectedBoardId(b.id);
                    setSelectedCompId(null);
                    setEditingBoard(false);
                  }}
                  className={`p-2 rounded cursor-pointer hover:bg-blue-50 ${
                    b.id === selectedBoardId ? "bg-blue-100 font-semibold" : ""
                  }`}
                >
                  {b.name || "(bez názvu)"}
                </li>
              ))}
            </ul>
          </div>

          {/* Tlačítka vedle sebe */}
          <div className="flex gap-2">
            <button
              className="flex-1 bg-blue-600 text-white py-1 rounded text-sm"
              onClick={() => setShowBoardDialog(true)}
            >
              ➕ Přidat
            </button>

            {selectedBoard && (
              <>
                <button
                  className="flex-1 bg-yellow-500 text-white py-1 rounded text-sm"
                  onClick={() => {
                    const copy = {
                      ...selectedBoard,
                      id: Date.now(),
                      vyrobniCislo: "",
                      komponenty: selectedBoard.komponenty.map((c) => ({
                        ...c,
                        id: Date.now() + Math.random(),
                      })),
                    };
                    setForm((f) => ({ ...f, boards: [...f.boards, copy] }));
                    setSelectedBoardId(copy.id);
                  }}
                >
                  📄 Kopírovat
                </button>
                <button
                  className="flex-1 bg-red-600 text-white py-1 rounded text-sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Opravdu chcete smazat tento rozvaděč včetně všech komponent?"
                      )
                    ) {
                      const newBoards = form.boards.filter((b) => b.id !== selectedBoardId);
                      setForm((f) => ({ ...f, boards: newBoards }));
                      setSelectedBoardId(newBoards.length > 0 ? newBoards[0].id : null);
                    }
                  }}
                >
                  🗑️ Smazat
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Detail rozvaděče */}
        <div className="flex-1 relative" ref={boardRef}>
          {selectedBoard && (
            <button
              className="absolute top-0 right-0 text-gray-500 hover:text-gray-700"
              onClick={()=> setEditingBoard(e=>!e)}
            >
              ✏️
            </button>
          )}
          <div className="grid md:grid-cols-3 gap-4"> 
            {selectedBoard ? (
              ([
                ["name","Název"],["vyrobce","Výrobce"],["typ","Typ"],
                ["vyrobniCislo","Výrobní číslo"],["napeti","Napětí"],
                ["proud","Proud"],["ip","IP krytí"],
                ["odpor","Přechodový odpor"],["umisteni","Umístění"]
              ] as [keyof Omit<Board,"id"|"komponenty">,string][]).map(
                ([k,label])=> (
                  <div key={k}>
                    <label className="block text-sm font-medium">{label}</label>
                    {editingBoard ? (
                      <input
                        className="w-full p-2 border rounded text-sm"
                        value={(selectedBoard as any)[k]||""}
                        onChange={(e:ChangeEvent<HTMLInputElement>)=>
                          setForm(f=>({
                            ...f,
                            boards:f.boards.map(b=>
                              b.id===selectedBoardId?{...b,[k]:e.target.value}:b
                            )
                          }))
                        }
                      />
                    ):(
                      <div className="p-2">{(selectedBoard as any)[k]}</div>
                    )}
                  </div>
                )
              )
            ) : (
              <div className="text-gray-500">Vyberte rozvaděč</div>
            )}
          </div>
        </div>
      </div>

      {editingBoard && (
        <div className="mb-4 text-right">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={()=> setEditingBoard(false)}
          >
            Uložit změny
          </button>
        </div>
      )}

      {/* Tabulka komponent */}
      {selectedBoard && (
        <>
          
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                {["#","Přístroj","Výrobce","Typ","Počet pólů","Dimenze","Riso [MΩ]","Ochrana [Ω]","Poznámka","Akce"].map(h=>(
                  <th key={h} className="p-2 text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedBoard.komponenty.map((c,i)=>(
                <ComponentRow
                  key={c.id}
                  c={c}
                  index={i}
                  isEditing={c.id===editingCompId}
                  onSelect={()=>setSelectedCompId(c.id)}
                  onEditToggle={()=>setEditingCompId(p=>p===c.id?null:c.id)}
                  onCopy={()=>handleCopyComponent(c.id)}
                  onDelete={()=>handleDeleteComponent(c.id)}
                  onSave={()=>setEditingCompId(null)}
                  renderCell={renderCell}
                />
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
          <button
            className="mb-2 bg-blue-600 text-white px-4 py-2 rounded text-sm"
            onClick={()=> setShowCompDialog(true)}
          >
            ➕ Přidat komponentu
          </button></div>
        </>
        
      )}

      {/* Dialog – nový rozvaděč */}
      {showBoardDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Nový rozvaděč</h3>
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              {(
                [
                  ["name","Název"],
                  ["vyrobce","Výrobce"],
                  ["typ","Typ"],
                  ["vyrobniCislo","Výrobní číslo"],
                  ["napeti","Napětí"],
                  ["proud","Proud"],
                  ["ip","IP krytí"],
                  ["odpor","Přechodový odpor"],
                  ["umisteni","Umístění"]
                ] as [keyof Omit<Board,"id"|"komponenty">,string][]
              ).map(([k,label])=>(
                <div key={k}>
                  <label className="block text-sm font-medium">{label}</label>
                  <input
                    className="w-full p-2 border rounded text-sm"
                    value={(newBoard as any)[k]||""}
                    onChange={e=>setNewBoard(b=>({...b,[k]:e.target.value}))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={()=>setShowBoardDialog(false)}>
                Zrušit
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleAddBoard}>
                Přidat rozvaděč
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog – nová komponenta */}
      {showCompDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Nová komponenta</h3>
            <div className="space-y-4 mb-4">
              {/* Přístroj */}
              <div>
                <label className="block text-sm font-medium">Přístroj</label>
                <select
                  className="w-full p-2 border rounded"
                  value={newComp.nazevId}
                  onChange={e=>{
                    const id=e.target.value, txt=e.target.selectedOptions[0].text;
                    setNewComp(c=>({...c,nazevId:id,nazev:txt,popisId:"",popis:"",typId:"",typ:""}));
                  }}
                >
                  <option value="">-- vyber --</option>
                  {types.map(t=>(
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </select>
              </div>
              {/* Výrobce */}
              <div>
                <label className="block text-sm font-medium">Výrobce</label>
                <select
                  className="w-full p-2 border rounded"
                  value={newComp.popisId}
                  onChange={e=>{
                    const id=e.target.value, txt=e.target.selectedOptions[0].text;
                    setNewComp(c=>({...c,popisId:id,popis:txt,typId:"",typ:""}));
                  }}
                >
                  <option value="">-- vyber --</option>
                  {manufacturers.map(m=>(
                    <option key={m.id} value={String(m.id)}>{m.name}</option>
                  ))}
                </select>
              </div>
              {/* Typ */}
              <div>
                <label className="block text-sm font-medium">Typ</label>
                <select
                  className="w-full p-2 border rounded"
                  value={newComp.typId}
                  onChange={e=>{
                    const id=e.target.value, txt=e.target.selectedOptions[0].text;
                    setNewComp(c=>({...c,typId:id,typ:txt}));
                  }}
                >
                  <option value="">-- vyber --</option>
                  {models.map(m=>(
                    <option key={m.id} value={String(m.id)}>{m.name}</option>
                  ))}
                </select>
              </div>
              {/* Počet pólů */}
              <div>
                <label className="block text-sm font-medium">Počet pólů</label>
                <select
                  className="w-full p-2 border rounded"
                  value={newComp.poles}
                  onChange={e=>setNewComp(c=>({...c,poles:e.target.value}))}
                >
                  <option value="">-- vyber --</option>
                  {polesOptions.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {/* Dimenze */}
              <div>
                <label className="block text-sm font-medium">Dimenze</label>
                <select
                  className="w-full p-2 border rounded"
                  value={newComp.dimenze}
                  onChange={e=>setNewComp(c=>({...c,dimenze:e.target.value}))}
                >
                  <option value="">-- vyber --</option>
                  {dimenzeOptions.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {/* Riso */}
              <div>
                <label className="block text-sm font-medium">Riso [MΩ]</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded text-sm"
                  value={newComp.riso}
                  onChange={e=>setNewComp(c=>({...c,riso:e.target.value}))}
                />
              </div>
              {/* Ochrana */}
              <div>
                <label className="block text-sm font-medium">Ochrana [Ω]</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded text-sm"
                  value={newComp.ochrana}
                  onChange={e=>setNewComp(c=>({...c,ochrana:e.target.value}))}
                />
              </div>
              {/* Poznámka */}
              <div>
                <label className="block text-sm font-medium">Poznámka</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded text-sm"
                  value={newComp.poznamka}
                  onChange={e=>setNewComp(c=>({...c,poznamka:e.target.value}))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={()=>setShowCompDialog(false)}>
                Zrušit
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleAddComponent}>
                Přidat komponentu
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
