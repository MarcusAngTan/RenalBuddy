export const DISCLAIMER =
  "RenalBuddy stores what you enter and the plan your nephrologist already prescribed. It does not give medical advice, calculate doses, or decide whether a dipstick means a relapse.";

export const EFFECTS = [
  { code: "sleep", label: "Sleep" },
  { code: "mood", label: "Mood" },
  { code: "appetite", label: "Appetite" },
  { code: "stomach", label: "Stomach" },
  { code: "face_swelling", label: "Face" },
  { code: "acne", label: "Skin" },
  { code: "infection_concern", label: "Infection concern" },
  { code: "other", label: "Other" },
] as const;

export const DIPSTICKS = [
  { value: "neg", label: "Neg" },
  { value: "trace", label: "Trace" },
  { value: "1+", label: "1+" },
  { value: "2+", label: "2+" },
  { value: "3+", label: "3+" },
  { value: "4+", label: "4+" },
] as const;

export const OEDEMA = [
  { value: 0, label: "None" },
  { value: 1, label: "Ankles" },
  { value: 2, label: "Legs" },
  { value: 3, label: "Widespread" },
] as const;

export const INTERESTS = [
  { value: "walking", label: "Walking" },
  { value: "music", label: "Music" },
  { value: "breathing", label: "Breathing" },
  { value: "rest", label: "Rest" },
  { value: "talking", label: "Talking to someone" },
  { value: "reading", label: "Reading" },
] as const;

export const SCHEDULES = [
  { value: "daily", label: "Once a day" },
  { value: "twice_daily", label: "Twice a day" },
  { value: "as_needed", label: "As needed" },
] as const;

export const UNITS = ["mg", "mcg", "g", "tablet", "mL"] as const;

export type DoseStatus = "taken" | "missed" | "different_dose";

export type User = {
  id: number;
  email: string;
  display_name: string;
  last_appointment_on: string | null;
  next_appointment_on: string | null;
  coping_interests: string[];
  disclaimer_accepted_at: string;
  has_clinical_data: boolean;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type SlotLog = {
  slot: "daily" | "morning" | "evening";
  status: DoseStatus | null;
  taken_dose: number | null;
  prescribed_dose: number | null;
};

export type MedToday = {
  id: number;
  name: string;
  dose_amount: number;
  dose_unit: string;
  schedule: "daily" | "twice_daily" | "as_needed";
  is_steroid: boolean;
  slots: SlotLog[];
};

export type TaperStep = {
  id: number;
  step_number: number;
  dose_amount: number;
  start_on: string;
  end_on: string;
  instruction: string | null;
  state: "done" | "current" | "upcoming";
};

export type TodayTaper = {
  plan_id: number;
  title: string;
  medication_name: string;
  dose_unit: string;
  prescribed_note: string | null;
  step: TaperStep | null;
  next_step: TaperStep | null;
  log_status: DoseStatus | null;
  taken_dose: number | null;
  prescribed_dose: number | null;
};

export type SideEffect = {
  effect_code: string;
  severity: number;
  note: string | null;
};

export type TodayPayload = {
  on: string;
  last_appointment_on: string | null;
  next_appointment_on: string | null;
  open_questions: number;
  taper: TodayTaper | null;
  medications: MedToday[];
  dipstick_result: string | null;
  weight_kg: number | null;
  oedema_score: number | null;
  side_effects: SideEffect[];
  mood: number | null;
  energy: number | null;
  sleep_quality: number | null;
  wellbeing_note: string | null;
};

export type Medication = {
  id: number;
  name: string;
  dose_amount: number;
  dose_unit: string;
  schedule: "daily" | "twice_daily" | "as_needed";
  is_steroid: boolean;
  status: "active" | "stopped";
  started_on: string;
  stopped_on: string | null;
  notes: string | null;
};

export type TaperPlan = {
  id: number;
  title: string;
  medication_name: string;
  dose_unit: string;
  prescribed_note: string | null;
  status: "active" | "replaced" | "completed";
  created_at: string;
  steps: TaperStep[];
};

export type JournalEntry = {
  id: number;
  body: string;
  include_in_summary: boolean;
  created_at: string;
};

export type DoctorQuestion = {
  id: number;
  body: string;
  status: "open" | "discussed";
  created_at: string;
  discussed_on: string | null;
};

export type Resource = {
  id: number;
  title: string;
  url: string;
  description: string;
};

export type CopingSuggestion = {
  id: string;
  title: string;
  body: string;
  tags: string[];
};

export type WellbeingLog = {
  id: number;
  log_on: string;
  mood: number;
  energy: number;
  sleep_quality: number;
  note: string | null;
};

export type SummarySection = {
  key: string;
  title: string;
  lines: string[];
};

export type Summary = {
  id: number | null;
  period_start: string;
  period_end: string;
  summary_text: string;
  summary_json: {
    period_start: string;
    period_end: string;
    sections: SummarySection[];
  };
  created_at: string | null;
};
