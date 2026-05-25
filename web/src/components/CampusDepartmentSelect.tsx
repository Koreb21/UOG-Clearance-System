import { getCampuses, getDepartmentsForCampus, type CampusCode } from "../modules/campus/campusDepartments";

interface CampusDepartmentSelectProps {
  campusId: string;
  departmentId: string;
  onCampusChange: (campusId: string) => void;
  onDepartmentChange: (departmentId: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
  allowAllCampuses?: boolean;
}

export function CampusDepartmentSelect({
  campusId,
  departmentId,
  onCampusChange,
  onDepartmentChange,
  disabled = false,
  required = false,
  className = "",
  labelClassName = "",
  selectClassName = "",
  allowAllCampuses = false,
}: CampusDepartmentSelectProps) {
  const campuses = getCampuses();
  const departments = getDepartmentsForCampus(campusId as CampusCode);

  function handleCampusChange(campusCode: string) {
    onCampusChange(campusCode);
    // Reset department when campus changes
    onDepartmentChange("");
  }

  const baseLabelClass = labelClassName || "mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]";
  const baseSelectClass = selectClassName || "w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none";

  return (
    <div className={className}>
      <div>
        <label className={baseLabelClass}>
          Campus {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={campusId}
          onChange={(e) => handleCampusChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={baseSelectClass}
        >
          {allowAllCampuses && <option value="">All Campuses</option>}
          {!allowAllCampuses && <option value="">Select campus…</option>}
          {campuses.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className={baseLabelClass}>
          Department {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={departmentId}
          onChange={(e) => onDepartmentChange(e.target.value)}
          disabled={disabled || !campusId}
          required={required}
          className={baseSelectClass}
        >
          <option value="">{campusId ? "Select department…" : "Select campus first"}</option>
          {departments.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
