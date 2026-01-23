/**
 * Medical Services Index
 * 의료/재활 관련 서비스 모음
 */

export { romService, default as ROMService } from './romService';
export type {
  RehabPhase,
  JointType,
  MovementType,
  Side,
  NormalROMRange,
  ROMMeasurement,
  ROMAssessment,
  XPReward,
} from './romService';
export {
  AAOS_ROM_STANDARDS,
  PHASE_THRESHOLDS,
  XP_CONFIG,
} from './romService';

export { safetyService, default as SafetyService } from './safetyService';
export type {
  RedFlagType,
  RedFlagSeverity,
  RedFlagAlert,
  VASLevel,
  SafetyStatus,
  SafetyConfig,
} from './safetyService';
export { DEFAULT_SAFETY_CONFIG } from './safetyService';
