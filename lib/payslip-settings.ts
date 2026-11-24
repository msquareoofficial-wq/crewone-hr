// Powered By Vistech Force
export type CustomField = {
  id: string;
  label: string;
  type: "earning" | "deduction" | "neutral";
  source: string; // system key or "manual"
  value?: string; // used when source === "manual"
};

export type PayslipSettings = {
  header_color: string;
  accent_color: string;
  address: string;
  currency: string;
  footer_note: string;
  show_signature: boolean;
  logo: string; // base64 data URL or ""
  custom_fields: CustomField[];
};

export const SYSTEM_SOURCES: { key: string; label: string }[] = [
  { key: "base_salary",        label: "Basic Salary" },
  { key: "bonus",              label: "Bonus" },
  { key: "absent_deduction",   label: "Absent Deduction" },
  { key: "late_deduction",     label: "Late Deduction" },
  { key: "other_deduction",    label: "Other Deduction" },
  { key: "present_days",       label: "Present Days" },
  { key: "leave_days",         label: "Leave Days" },
  { key: "absent_days",        label: "Absent Days" },
  { key: "late_count",         label: "Late Count" },
  { key: "working_days",       label: "Working Days" },
  { key: "manual",             label: "Manual value" },
];

const COUNT_SOURCES = new Set(["present_days","leave_days","absent_days","late_count","working_days"]);
export const isCountSource = (src: string) => COUNT_SOURCES.has(src);

export const DEFAULT_FIELDS: CustomField[] = [
  { id: "d1", label: "Basic Salary",      type: "earning",   source: "base_salary" },
  { id: "d2", label: "Bonus",             type: "earning",   source: "bonus" },
  { id: "d3", label: "Absent Deduction",  type: "deduction", source: "absent_deduction" },
  { id: "d4", label: "Late Deduction",    type: "deduction", source: "late_deduction" },
  { id: "d5", label: "Other Deduction",   type: "deduction", source: "other_deduction" },
];

export const PAYSLIP_DEFAULTS: PayslipSettings = {
  header_color: "#0f172a",
  accent_color: "#0f172a",
  address: "",
  currency: "",
  footer_note: "This is a system generated payslip.",
  show_signature: false,
  logo: "",
  custom_fields: DEFAULT_FIELDS,
};
