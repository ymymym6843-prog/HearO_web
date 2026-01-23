/**
 * HearO-Web Medical Core Type Definitions
 * HearO-v2의 의료 기능을 위한 타입 정의
 * Generated from: 003_medical_core.sql
 */

// ============================================================
// Database Schema Types
// ============================================================

export type UserType = 'patient' | 'clinician' | 'general';
export type RehabilitationMode = 'knee' | 'shoulder' | 'back' | 'hip';
export type RelationshipStatus = 'active' | 'inactive';
export type AffectedSide = 'left' | 'right' | 'bilateral';
export type MeasurementType = 'active' | 'passive';
export type ProgramType = 'rehab' | 'fitness';
export type CompletionStatus = 'completed' | 'pain_stop' | 'user_stop' | 'error' | 'in_progress';
export type PainLevel = 0 | 1 | 2 | 3;

// ============================================================
// Extended Profile (profiles 테이블)
// ============================================================

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  preferred_worldview?: string;

  // Medical Core 확장
  user_type: UserType;
  level: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;

  // 의료진 전용
  license_number?: string;
  hospital?: string;
  specialization?: string;
}

// 프로필 업데이트 (부분 업데이트)
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

// ============================================================
// Patient (patients 테이블)
// ============================================================

export interface Patient {
  id: string;
  user_id: string;
  condition?: string;
  rehabilitation_mode?: RehabilitationMode;
  current_phase: number;
  eligibility_checked: boolean;
  eligibility_passed?: boolean;
  contraindications?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PatientInsert {
  user_id: string;
  condition?: string;
  rehabilitation_mode?: RehabilitationMode;
  current_phase?: number;
  eligibility_checked?: boolean;
  eligibility_passed?: boolean;
  contraindications?: Record<string, unknown>;
}

export type PatientUpdate = Partial<Omit<PatientInsert, 'user_id'>>;

// ============================================================
// Clinician-Patient Relationship
// ============================================================

export interface ClinicianPatientRelationship {
  clinician_id: string;
  patient_id: string;
  status: RelationshipStatus;
  created_at: string;
}

export interface RelationshipInsert {
  clinician_id: string;
  patient_id: string;
  status?: RelationshipStatus;
}

// ============================================================
// ROM Measurement (rom_measurements 테이블)
// ============================================================

export interface ROMMeasurement {
  id: string;
  patient_id: string;
  session_id?: string;
  joint_type: string;
  movement_type: string;
  angle: number;
  affected_side?: AffectedSide;
  measurement_type?: MeasurementType;
  confidence?: number;
  is_valid: boolean;
  compensation_detected: boolean;
  measured_at: string;
}

export interface ROMMeasurementInsert {
  patient_id: string;
  session_id?: string;
  joint_type: string;
  movement_type: string;
  angle: number;
  affected_side?: AffectedSide;
  measurement_type?: MeasurementType;
  confidence?: number;
  is_valid?: boolean;
  compensation_detected?: boolean;
}

// ROM 추이 분석 결과
export interface ROMTrend {
  joint_type: string;
  movement_type: string;
  affected_side?: string;
  measurement_date: string;
  avg_angle: number;
  measurement_count: number;
}

// ============================================================
// Exercise Session (확장된 exercise_sessions)
// ============================================================

export interface ExerciseSession {
  id: string;
  user_id: string;
  exercise_type: string;
  worldview?: string;
  started_at: string;
  ended_at?: string;
  total_reps: number;
  target_reps: number;
  average_accuracy: number;
  duration_seconds: number;
  status: string;
  created_at: string;

  // Medical Core 확장
  patient_id?: string;
  program_type?: ProgramType;
  thermal_events: number;
  chapter_number?: number;
  episode_number?: number;
  completion_status: CompletionStatus;
}

export interface ExerciseSessionInsert {
  user_id: string;
  exercise_type: string;
  worldview?: string;
  target_reps?: number;
  patient_id?: string;
  program_type?: ProgramType;
  chapter_number?: number;
  episode_number?: number;
}

export interface ExerciseSessionUpdate {
  ended_at?: string;
  total_reps?: number;
  average_accuracy?: number;
  duration_seconds?: number;
  status?: string;
  thermal_events?: number;
  completion_status?: CompletionStatus;
}

// ============================================================
// Pain Event (pain_events 테이블)
// ============================================================

export interface PainEvent {
  id: string;
  patient_id: string;
  session_id?: string;
  pain_level: PainLevel;
  exercise_id?: string;
  body_part?: string;
  notes?: string;
  clinician_notified: boolean;
  created_at: string;
}

export interface PainEventInsert {
  patient_id: string;
  session_id?: string;
  pain_level: PainLevel;
  exercise_id?: string;
  body_part?: string;
  notes?: string;
}

// ============================================================
// Helper Function Return Types
// ============================================================

// get_clinician_patients() 반환 타입
export interface ClinicianPatientSummary {
  patient_id: string;
  patient_name?: string;
  rehabilitation_mode?: RehabilitationMode;
  current_phase: number;
  total_sessions: number;
  last_session?: string;
  avg_accuracy?: number;
}

// get_patient_rom_trend() 반환 타입
export type PatientROMTrend = ROMTrend;

// get_recent_pain_events() 반환 타입
export interface RecentPainEvent {
  event_id: string;
  patient_name?: string;
  pain_level: PainLevel;
  body_part?: string;
  exercise_id?: string;
  created_at: string;
  clinician_notified: boolean;
}

// ============================================================
// API Request/Response Types
// ============================================================

// ROM 측정 요청
export interface ROMMeasurementRequest {
  joint_type: string;
  movement_type: string;
  angle: number;
  affected_side?: AffectedSide;
  measurement_type?: MeasurementType;
  confidence?: number;
  session_id?: string;
}

// 환자 등록 요청
export interface PatientRegistrationRequest {
  condition?: string;
  rehabilitation_mode: RehabilitationMode;
  current_phase?: number;
  eligibility_checked: boolean;
  eligibility_passed: boolean;
  contraindications?: Record<string, unknown>;
}

// 의료진-환자 연결 요청
export interface ConnectPatientRequest {
  patient_id: string;
}

// 통증 보고 요청
export interface PainReportRequest {
  pain_level: PainLevel;
  exercise_id?: string;
  body_part?: string;
  notes?: string;
  session_id?: string;
}

// ============================================================
// Utility Types
// ============================================================

// Supabase 응답 타입
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    details: string;
    hint: string;
    code: string;
  } | null;
}

// 페이지네이션
export interface Pagination {
  page: number;
  limit: number;
  total?: number;
}

// 날짜 범위 필터
export interface DateRangeFilter {
  from: string;
  to: string;
}

// ROM 필터 옵션
export interface ROMFilterOptions {
  joint_type?: string;
  movement_type?: string;
  affected_side?: AffectedSide;
  measurement_type?: MeasurementType;
  date_range?: DateRangeFilter;
  min_confidence?: number;
  only_valid?: boolean;
}

// 세션 필터 옵션
export interface SessionFilterOptions {
  program_type?: ProgramType;
  worldview?: string;
  completion_status?: CompletionStatus;
  date_range?: DateRangeFilter;
  min_accuracy?: number;
}

// ============================================================
// Constants
// ============================================================

export const PAIN_LEVEL_LABELS: Record<PainLevel, string> = {
  0: '없음',
  1: '경미',
  2: '중간',
  3: '심각',
};

export const REHABILITATION_MODE_LABELS: Record<RehabilitationMode, string> = {
  knee: '무릎',
  shoulder: '어깨',
  back: '허리',
  hip: '고관절',
};

export const AFFECTED_SIDE_LABELS: Record<AffectedSide, string> = {
  left: '왼쪽',
  right: '오른쪽',
  bilateral: '양측',
};

export const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  active: '능동',
  passive: '수동',
};

export const COMPLETION_STATUS_LABELS: Record<CompletionStatus, string> = {
  completed: '완료',
  pain_stop: '통증 중단',
  user_stop: '사용자 중단',
  error: '오류',
  in_progress: '진행중',
};

export const USER_TYPE_LABELS: Record<UserType, string> = {
  patient: '환자',
  clinician: '의료진',
  general: '일반',
};

// ============================================================
// Type Guards
// ============================================================

export function isPainLevel(value: number): value is PainLevel {
  return value >= 0 && value <= 3 && Number.isInteger(value);
}

export function isRehabilitationMode(value: string): value is RehabilitationMode {
  return ['knee', 'shoulder', 'back', 'hip'].includes(value);
}

export function isAffectedSide(value: string): value is AffectedSide {
  return ['left', 'right', 'bilateral'].includes(value);
}

export function isMeasurementType(value: string): value is MeasurementType {
  return ['active', 'passive'].includes(value);
}

export function isCompletionStatus(value: string): value is CompletionStatus {
  return ['completed', 'pain_stop', 'user_stop', 'error', 'in_progress'].includes(value);
}

export function isUserType(value: string): value is UserType {
  return ['patient', 'clinician', 'general'].includes(value);
}
