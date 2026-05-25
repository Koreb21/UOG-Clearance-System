import type { ClearanceCheck, UserRole } from "../../types";

export const roleConfigs: Record<
  Extract<UserRole, "LIBRARIAN" | "PROCTOR" | "CAFE_STAFF" | "DEPARTMENT_HEAD" | "STUDENT_DEAN">,
  {
    officeName: string;
    roleBadge: string;
    headerTitle: string;
    heroTitle: string;
    heroCopy: string;
    decisionLabel: string;
    clarificationLabel: string;
    queueLabel: string;
    reviewOptions: ClearanceCheck["status"][];
    liabilityTitle: string;
    liabilityItemLabel: string;
    liabilityCategoryLabel: string;
    liabilityDescriptionLabel: string;
    paymentDefault: boolean;
    inquiryPlaceholder: string;
    targetCheckCode: string;
  }
> = {
  LIBRARIAN: {
    officeName: "Library",
    roleBadge: "Librarian",
    headerTitle: "Library",
    heroTitle: "Library Clearance Workspace",
    heroCopy:
      "Review pending book returns, assess fines, and authorize clearances for students on your campus.",
    decisionLabel: "Submit library decision",
    clarificationLabel: "Request clarification",
    queueLabel: "Active queue",
    reviewOptions: ["CLEARED", "FLAGGED", "IN_REVIEW", "FAILED"],
    liabilityTitle: "Library liability",
    liabilityItemLabel: "Book or resource",
    liabilityCategoryLabel: "Category",
    liabilityDescriptionLabel: "Observation notes",
    paymentDefault: true,
    inquiryPlaceholder: "Explain the library issue or fine the student must resolve.",
    targetCheckCode: "LIBRARY"
  },
  PROCTOR: {
    officeName: "Proctor",
    roleBadge: "Proctor",
    headerTitle: "Proctor",
    heroTitle: "Dormitory Clearance Workspace",
    heroCopy:
      "Asset inspection, damage assessment, and liability documentation. Verify financial standing where required.",
    decisionLabel: "Submit proctor decision",
    clarificationLabel: "Request dorm clarification",
    queueLabel: "Inspection queue",
    reviewOptions: ["CLEARED", "FLAGGED", "IN_REVIEW", "FAILED"],
    liabilityTitle: "Dorm liability",
    liabilityItemLabel: "Asset or damage",
    liabilityCategoryLabel: "Category",
    liabilityDescriptionLabel: "Inspection note",
    paymentDefault: true,
    inquiryPlaceholder: "Explain the dormitory issue or payment still required.",
    targetCheckCode: "PROCTOR"
  },
  CAFE_STAFF: {
    officeName: "Cafe",
    roleBadge: "Cafe Staff",
    headerTitle: "Cafeteria",
    heroTitle: "Cafe Clearance Workspace",
    heroCopy:
      "Verify meal-card and cafeteria obligations for students clearing on your campus.",
    decisionLabel: "Submit cafe decision",
    clarificationLabel: "Request cafe clarification",
    queueLabel: "Verification queue",
    reviewOptions: ["CLEARED", "FLAGGED", "IN_REVIEW", "FAILED"],
    liabilityTitle: "Cafe liability",
    liabilityItemLabel: "Meal or cafe item",
    liabilityCategoryLabel: "Liability type",
    liabilityDescriptionLabel: "Notes",
    paymentDefault: true,
    inquiryPlaceholder: "Explain the cafeteria debt or card issue.",
    targetCheckCode: "CAFE"
  },
  DEPARTMENT_HEAD: {
    officeName: "Academic",
    roleBadge: "Department Head",
    headerTitle: "Academic",
    heroTitle: "Academic Clearance Workspace",
    heroCopy:
      "Verify academic eligibility and program requirements before the student proceeds in clearance.",
    decisionLabel: "Submit clearance decision",
    clarificationLabel: "Request clarification",
    queueLabel: "Department queue",
    reviewOptions: ["CLEARED", "IN_REVIEW", "FAILED"],
    liabilityTitle: "Academic note",
    liabilityItemLabel: "Academic item",
    liabilityCategoryLabel: "Category",
    liabilityDescriptionLabel: "Reason / note",
    paymentDefault: false,
    inquiryPlaceholder: "Explain the academic issue or action required.",
    targetCheckCode: "DEPARTMENT_HEAD"
  },
  STUDENT_DEAN: {
    officeName: "Student Affairs",
    roleBadge: "Student Dean",
    headerTitle: "Dean of Students",
    heroTitle: "Student Affairs Workspace",
    heroCopy:
      "Conduct and behavioral clearance for students on your campus.",
    decisionLabel: "Submit conduct decision",
    clarificationLabel: "Request conduct clarification",
    queueLabel: "Behavioral queue",
    reviewOptions: ["CLEARED", "IN_REVIEW", "FLAGGED", "FAILED"],
    liabilityTitle: "Discipline case",
    liabilityItemLabel: "Case item",
    liabilityCategoryLabel: "Case category",
    liabilityDescriptionLabel: "Conduct note",
    paymentDefault: false,
    inquiryPlaceholder: "Explain the disciplinary or conduct resolution needed.",
    targetCheckCode: "STUDENT_DEAN"
  }
};
