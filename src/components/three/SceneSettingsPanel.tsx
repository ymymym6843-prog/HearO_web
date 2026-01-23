'use client';

/**
 * 3D 씬 설정 패널
 * Utonics 벤치마킹: 조명, 카메라 앵글, 헬퍼 설정 UI
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type {
  LightingPreset,
  CameraAngle,
  SceneHelpers,
  LightingSettings,
} from '@/types/scene';
import { CAMERA_PRESETS, LIGHTING_PRESETS } from '@/types/scene';

interface SceneSettingsPanelProps {
  // 조명
  lighting: LightingSettings;
  lightingPreset: LightingPreset;
  onLightingPresetChange: (preset: LightingPreset) => void;
  onAmbientChange: (value: number) => void;
  onDirectionalChange: (value: number) => void;
  onHemisphereChange: (value: number) => void;
  // 카메라
  cameraAngle: CameraAngle;
  onCameraAngleChange: (angle: CameraAngle) => void;
  // 헬퍼
  helpers: SceneHelpers;
  onToggleGrid: () => void;
  onToggleAxes: () => void;
  // 리셋
  onReset: () => void;
  // UI 옵션
  className?: string;
  compact?: boolean;
}

// 접을 수 있는 섹션 컴포넌트
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name={icon as any} size={16} className="text-white/60" />
          <span className="text-sm font-medium text-white/80">{title}</span>
        </div>
        <Icon
          name={isOpen ? 'arrow-up-outline' : 'arrow-down-outline'}
          size={16}
          className="text-white/40"
        />
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// 슬라이더 컴포넌트
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3
                   [&::-webkit-slider-thumb]:h-3
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-purple-500
                   [&::-webkit-slider-thumb]:hover:bg-purple-400
                   [&::-webkit-slider-thumb]:transition-colors"
      />
    </div>
  );
}

// 프리셋 버튼 그룹
function PresetButtons<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="flex gap-1">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-all
            ${
              value === option
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

export function SceneSettingsPanel({
  lighting,
  lightingPreset,
  onLightingPresetChange,
  onAmbientChange,
  onDirectionalChange,
  onHemisphereChange,
  cameraAngle,
  onCameraAngleChange,
  helpers,
  onToggleGrid,
  onToggleAxes,
  onReset,
  className = '',
  compact = false,
}: SceneSettingsPanelProps) {
  const lightingPresetLabels: Record<LightingPreset, string> = {
    dark: '어둡게',
    default: '기본',
    bright: '밝게',
    custom: '사용자',
  };

  const cameraAngleLabels: Record<CameraAngle, string> = {
    front: '정면',
    left: '좌측',
    right: '우측',
    back: '후면',
    top: '위',
    custom: '자유',
  };

  return (
    <div
      className={`bg-black/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden ${className}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Icon name="settings-outline" size={16} className="text-purple-400" />
          <span className="text-sm font-medium text-white">씬 설정</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          초기화
        </button>
      </div>

      {/* 조명 설정 */}
      <CollapsibleSection title="조명" icon="flash-outline" defaultOpen={!compact}>
        <div className="space-y-3">
          {/* 프리셋 */}
          <PresetButtons
            options={['dark', 'default', 'bright'] as LightingPreset[]}
            value={lightingPreset === 'custom' ? 'default' : lightingPreset}
            onChange={onLightingPresetChange}
            labels={lightingPresetLabels}
          />

          {/* 개별 슬라이더 */}
          <div className="pt-2 space-y-1">
            <Slider
              label="주변광"
              value={lighting.ambientIntensity}
              min={0}
              max={2}
              step={0.1}
              onChange={onAmbientChange}
            />
            <Slider
              label="방향광"
              value={lighting.directionalIntensity}
              min={0}
              max={2}
              step={0.1}
              onChange={onDirectionalChange}
            />
            <Slider
              label="환경광"
              value={lighting.hemisphereIntensity}
              min={0}
              max={2}
              step={0.1}
              onChange={onHemisphereChange}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* 카메라 앵글 */}
      <CollapsibleSection title="카메라" icon="videocam-outline" defaultOpen={!compact}>
        <div className="grid grid-cols-5 gap-1">
          {(['front', 'left', 'right', 'back', 'top'] as CameraAngle[]).map(
            (angle) => (
              <button
                key={angle}
                onClick={() => onCameraAngleChange(angle)}
                className={`px-2 py-1.5 text-xs rounded-md transition-all
                  ${
                    cameraAngle === angle
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
              >
                {cameraAngleLabels[angle]}
              </button>
            )
          )}
        </div>
      </CollapsibleSection>

      {/* 뷰 설정 (헬퍼) */}
      <CollapsibleSection title="뷰" icon="eye-outline" defaultOpen={!compact}>
        <div className="flex gap-2">
          <button
            onClick={onToggleGrid}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded-md transition-all
              ${
                helpers.showGrid
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
          >
            <Icon name="cube-outline" size={14} />
            그리드
          </button>
          <button
            onClick={onToggleAxes}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs rounded-md transition-all
              ${
                helpers.showAxes
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
          >
            <Icon name="move-outline" size={14} />
            축
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default SceneSettingsPanel;
