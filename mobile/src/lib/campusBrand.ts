type CampusBrand = {
  code: string;
  name: string;
  shortName: string;
  mark: string;
  accent: string;
  accentSoft: string;
  text: string;
};

const campusBrands: Record<string, CampusBrand> = {
  MARAKI: {
    code: "MARAKI",
    name: "Maraki Campus",
    shortName: "Maraki",
    mark: "MK",
    accent: "#0f766e",
    accentSoft: "#d9efe9",
    text: "#0b4f4a"
  },
  TEWODROS: {
    code: "TEWODROS",
    name: "Atse Tewodros Campus",
    shortName: "Tewodros",
    mark: "AT",
    accent: "#9a3412",
    accentSoft: "#f8dfd2",
    text: "#7c2d12"
  },
  FASIL: {
    code: "FASIL",
    name: "Atse Fasil Campus",
    shortName: "Fasil",
    mark: "AF",
    accent: "#1d4ed8",
    accentSoft: "#dbe8ff",
    text: "#1e3a8a"
  }
};

const fallbackBrand: CampusBrand = {
  code: "UOG",
  name: "University of Gondar",
  shortName: "UoG",
  mark: "UG",
  accent: "#0f766e",
  accentSoft: "#d9efe9",
  text: "#0b4f4a"
};

export function getCampusBrand(code?: string | null) {
  if (!code) {
    return fallbackBrand;
  }
  return campusBrands[code] ?? fallbackBrand;
}
