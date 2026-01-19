/**
 * Supabase 데이터베이스 타입 정의
 * Supabase JS v2 타입 호환
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // 사용자 프로필
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          preferred_worldview: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_worldview?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_worldview?: string | null;
        };
        Relationships: [];
      };

      // 운동 세션
      exercise_sessions: {
        Row: {
          id: string;
          user_id: string;
          exercise_type: string;
          worldview: string | null;
          started_at: string;
          ended_at: string | null;
          total_reps: number;
          target_reps: number;
          average_accuracy: number;
          duration_seconds: number;
          status: 'in_progress' | 'completed' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_type: string;
          worldview?: string | null;
          started_at?: string;
          ended_at?: string | null;
          total_reps?: number;
          target_reps?: number;
          average_accuracy?: number;
          duration_seconds?: number;
          status?: 'in_progress' | 'completed' | 'cancelled';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_type?: string;
          worldview?: string | null;
          started_at?: string;
          ended_at?: string | null;
          total_reps?: number;
          target_reps?: number;
          average_accuracy?: number;
          duration_seconds?: number;
          status?: 'in_progress' | 'completed' | 'cancelled';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_sessions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      // 운동 기록 (각 반복별)
      exercise_reps: {
        Row: {
          id: string;
          session_id: string;
          rep_number: number;
          accuracy: number;
          max_angle: number;
          min_angle: number;
          hold_time: number | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          rep_number: number;
          accuracy: number;
          max_angle?: number;
          min_angle?: number;
          hold_time?: number | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          rep_number?: number;
          accuracy?: number;
          max_angle?: number;
          min_angle?: number;
          hold_time?: number | null;
          timestamp?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_reps_session_id_fkey';
            columns: ['session_id'];
            referencedRelation: 'exercise_sessions';
            referencedColumns: ['id'];
          },
        ];
      };

      // 캘리브레이션 데이터
      calibrations: {
        Row: {
          id: string;
          user_id: string;
          joint_type: string;
          start_angle: number;
          target_angle: number;
          tolerance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          joint_type: string;
          start_angle: number;
          target_angle: number;
          tolerance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          joint_type?: string;
          start_angle?: number;
          target_angle?: number;
          tolerance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'calibrations_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      // 사용자 설정
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          haptic_enabled: boolean;
          sound_enabled: boolean;
          tts_enabled: boolean;
          accessibility_mode: boolean;
          preferred_language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          haptic_enabled?: boolean;
          sound_enabled?: boolean;
          tts_enabled?: boolean;
          accessibility_mode?: boolean;
          preferred_language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          haptic_enabled?: boolean;
          sound_enabled?: boolean;
          tts_enabled?: boolean;
          accessibility_mode?: boolean;
          preferred_language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_settings_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      // 통증 기록
      pain_records: {
        Row: {
          id: string;
          user_id: string;
          body_part: string;
          pain_level: number;
          pain_type: string | null;
          timing: string | null;
          notes: string | null;
          session_id: string | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          body_part: string;
          pain_level: number;
          pain_type?: string | null;
          timing?: string | null;
          notes?: string | null;
          session_id?: string | null;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          body_part?: string;
          pain_level?: number;
          pain_type?: string | null;
          timing?: string | null;
          notes?: string | null;
          session_id?: string | null;
          timestamp?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pain_records_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// 편의 타입 별칭
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ExerciseSession = Database['public']['Tables']['exercise_sessions']['Row'];
export type ExerciseRep = Database['public']['Tables']['exercise_reps']['Row'];
export type Calibration = Database['public']['Tables']['calibrations']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type PainRecordRow = Database['public']['Tables']['pain_records']['Row'];

// Insert 타입
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ExerciseSessionInsert = Database['public']['Tables']['exercise_sessions']['Insert'];
export type ExerciseRepInsert = Database['public']['Tables']['exercise_reps']['Insert'];
export type CalibrationInsert = Database['public']['Tables']['calibrations']['Insert'];
export type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];
export type PainRecordInsert = Database['public']['Tables']['pain_records']['Insert'];
