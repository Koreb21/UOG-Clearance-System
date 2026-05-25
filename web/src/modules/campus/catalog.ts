export type CampusCode = "MARAKI" | "TEWODROS" | "FASIL";

export const campusCatalog: Array<{
  code: CampusCode;
  slug: string;
  name: string;
  tagline: string;
}> = [
  {
    code: "MARAKI",
    slug: "maraki",
    name: "Maraki Campus",
    tagline: "For student, staff, and registrar work assigned to Maraki."
  },
  {
    code: "TEWODROS",
    slug: "tewodros",
    name: "Atse Tewodros Campus",
    tagline: "For student, staff, and registrar work assigned to Atse Tewodros."
  },
  {
    code: "FASIL",
    slug: "fasil",
    name: "Atse Fasil Campus",
    tagline: "For student, staff, and registrar work assigned to Atse Fasil."
  }
];

export function getCampusBySlug(slug?: string) {
  return campusCatalog.find((campus) => campus.slug === slug);
}

export function getCampusByCode(code?: string | null) {
  return campusCatalog.find((campus) => campus.code === code);
}
