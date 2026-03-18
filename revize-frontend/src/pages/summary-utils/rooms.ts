const clean = (value: any) => String(value ?? "").trim();

const labeled = (label: string, value: any, unit = "") => {
  const text = clean(value);
  return text ? `${label}: ${text}${unit ? ` ${unit}` : ""}` : "";
};

const joinLines = (...lines: Array<string | undefined>) =>
  lines
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .join("\n");

export function buildRoomDeviceSummary(device: any, empty = "—") {
  const prvek = clean(device?.typ);
  const prvekSubtext = labeled("Počet", device?.pocet);
  const parametry = joinLines(labeled("Dim.", device?.dimenze));
  const mereni = joinLines(
    labeled("Riso", device?.riso, "MΩ"),
    labeled("Ochrana", device?.ochrana, "Ω")
  );
  const poznamka = clean(device?.podrobnosti || device?.note);

  return {
    prvek: prvek || empty,
    prvekSubtext: prvekSubtext || "",
    parametry: parametry || empty,
    mereni: mereni || empty,
    poznamka: poznamka || empty,
  };
}

export function roomNoteText(room: any, empty = "—") {
  return clean(room?.details) || empty;
}

export function hasRoomNote(room: any) {
  return clean(room?.details).length > 0;
}
