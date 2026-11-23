// Powered By Vistech Force
export type PayslipSettings = {
  header_color: string;
  accent_color: string;
  address: string;
  currency: string;
  footer_note: string;
  show_signature: boolean;
};

export const PAYSLIP_DEFAULTS: PayslipSettings = {
  header_color: "#0f172a",
  accent_color: "#0f172a",
  address: "",
  currency: "",
  footer_note: "This is a system generated payslip.",
  show_signature: false,
};
