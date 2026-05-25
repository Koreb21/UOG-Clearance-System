export type CampusCode = "TEWODROS" | "FASIL" | "MARAKI";

export interface CampusInfo {
  code: CampusCode;
  name: string;
  departments: DepartmentInfo[];
}

export interface DepartmentInfo {
  code: string;
  name: string;
}

export const campusDepartments: Record<CampusCode, CampusInfo> = {
  TEWODROS: {
    code: "TEWODROS",
    name: "Atse Tewodros Campus",
    departments: [
      { code: "CS", name: "Computer Science" },
      { code: "IS", name: "Information Systems" },
      { code: "IT", name: "Information Technology" },
      { code: "INSC", name: "Information Science" },
      { code: "SWE", name: "Software Engineering" },
      { code: "BIO", name: "Bio Technology" },
      { code: "VET", name: "Veterinary" },
      { code: "ECON", name: "Economics" },
      { code: "SPORT", name: "Sport Science" },
      { code: "AGRI", name: "Agriculture" },
    ],
  },
  FASIL: {
    code: "FASIL",
    name: "Atse Fasil Campus",
    departments: [
      { code: "ARCH", name: "Architecture" },
      { code: "ELEC", name: "Electrical" },
      { code: "TEXT", name: "Textile (Cotum)" },
      { code: "MECH", name: "Mechanical" },
      { code: "CIVIL", name: "Civil" },
      { code: "FOOD", name: "Food Engineering" },
    ],
  },
  MARAKI: {
    code: "MARAKI",
    name: "Maraki Campus",
    departments: [
      { code: "LAW", name: "Law" },
      { code: "MKT", name: "Marketing" },
      { code: "MGT", name: "Management" },
      { code: "JOUR", name: "Journalism" },
      { code: "PSY", name: "Psychology" },
      { code: "ACC", name: "Accounting" },
    ],
  },
};

export function getCampuses(): CampusInfo[] {
  return Object.values(campusDepartments);
}

export function getDepartmentsForCampus(campusCode?: CampusCode | string | null): DepartmentInfo[] {
  if (!campusCode) return [];
  const normalized = campusCode as CampusCode;
  return campusDepartments[normalized]?.departments ?? [];
}

export function getDepartmentName(campusCode: string, deptCode: string): string {
  const depts = getDepartmentsForCampus(campusCode);
  return depts.find((d) => d.code === deptCode)?.name ?? deptCode;
}

export function getDepartmentCode(campusCode: string, deptName: string): string | undefined {
  const depts = getDepartmentsForCampus(campusCode);
  return depts.find(
    (d) => d.name.toLowerCase() === deptName.toLowerCase()
  )?.code;
}

export function getCampusName(code: string): string {
  return campusDepartments[code as CampusCode]?.name ?? code;
}
