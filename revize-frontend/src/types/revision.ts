// src/types/revision.ts

/**
 * Typy pro revizní data vrácená z backendu
 */

/** Komponenta v rozvaděči */
export interface BoardDevice {
  id: number;
  nazev: string;
  popis: string;
  poles: string;
  dimenze: string;
  riso: string;
  ochrana: string;
}

/** Rozvaděč s komponentami */
export interface Board {
  id: number;
  name: string;
  vyrobce: string;
  typ: string;
  vyrobniCislo: string;
  napetiProud: string;
  supplySystem: string;
  supplyPhase: string;
  ip: string;
  prechodovyOdpor: string;
  umisteni: string;
  komponenty: BoardDevice[];
}

/** Zařízení / spotřebič v místnosti */
export interface RoomDevice {
  id: number;
  pocet: number;
  typ: string;
  dimenze: string;
  ochrana: string;
  riso: string;
  podrobnosti?: string;
}

/** Místnost se spotřebiči */
export interface Room {
  id: number;
  name: string;
  details?: string;
  devices: RoomDevice[];
}

/** Výsledek jedné zkoušky */
export interface TestResult {
  note?: string;
}

/** Závada */
export interface Defect {
  description: string;
  standard: string;
  article: string;
}

/** Závěrečná část */
export interface Conclusion {
  text: string;
  safety: 'able' | 'not';
  validUntil?: string;
}

/** Hlavní rozhraní pro revisionFormContext */
export interface RevisionData {
  evidencni: string;
  objekt: string;
  adresa: string;
  objednatel: string;
  typRevize: string;
  sit: string;
  voltage: string;
  date_start: string;
  date_end: string;
  date_created: string;

  norms: string[];
  customNorm1?: string;
  customNorm2?: string;
  customNorm3?: string;

  protection_basic: string[];
  protection_fault: string[];
  protection_additional: string[];

  performedTasks: string[];
  inspectionDescription: string;

  tests: Record<string, TestResult>;

  boards: Board[];
  rooms: Room[];
  defects: Defect[];
  conclusion: Conclusion;
}
