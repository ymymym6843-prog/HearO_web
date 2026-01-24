/**
 * FBX 손 모델 로더 및 애니메이터
 * MediaPipe 손 랜드마크를 3D 손 모델에 적용
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { HandLandmarkPoint } from '@/types/hand';

// MediaPipe 손 랜드마크 인덱스
export const HandLandmarkIndex = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

// FBX 손 뼈대 이름 매핑 (일반적인 네이밍 컨벤션)
// 실제 FBX 모델에 따라 수정 필요
export interface HandBoneMapping {
  wrist: string;
  thumb: { metacarpal?: string; proximal: string; distal: string; tip?: string };
  index: { metacarpal?: string; proximal: string; intermediate: string; distal: string; tip?: string };
  middle: { metacarpal?: string; proximal: string; intermediate: string; distal: string; tip?: string };
  ring: { metacarpal?: string; proximal: string; intermediate: string; distal: string; tip?: string };
  pinky: { metacarpal?: string; proximal: string; intermediate: string; distal: string; tip?: string };
}

// 기본 뼈대 이름 매핑 (Mixamo/일반 FBX 기준)
export const DEFAULT_BONE_MAPPING: HandBoneMapping = {
  wrist: 'Hand',
  thumb: {
    metacarpal: 'ThumbMetacarpal',
    proximal: 'ThumbProximal',
    distal: 'ThumbDistal',
  },
  index: {
    metacarpal: 'IndexMetacarpal',
    proximal: 'IndexProximal',
    intermediate: 'IndexIntermediate',
    distal: 'IndexDistal',
  },
  middle: {
    metacarpal: 'MiddleMetacarpal',
    proximal: 'MiddleProximal',
    intermediate: 'MiddleIntermediate',
    distal: 'MiddleDistal',
  },
  ring: {
    metacarpal: 'RingMetacarpal',
    proximal: 'RingProximal',
    intermediate: 'RingIntermediate',
    distal: 'RingDistal',
  },
  pinky: {
    metacarpal: 'PinkyMetacarpal',
    proximal: 'PinkyProximal',
    intermediate: 'PinkyIntermediate',
    distal: 'PinkyDistal',
  },
};

// Mixamo 스타일 뼈대 이름 매핑
export const MIXAMO_BONE_MAPPING: HandBoneMapping = {
  wrist: 'mixamorig:Hand',
  thumb: {
    proximal: 'mixamorig:HandThumb1',
    distal: 'mixamorig:HandThumb2',
  },
  index: {
    proximal: 'mixamorig:HandIndex1',
    intermediate: 'mixamorig:HandIndex2',
    distal: 'mixamorig:HandIndex3',
  },
  middle: {
    proximal: 'mixamorig:HandMiddle1',
    intermediate: 'mixamorig:HandMiddle2',
    distal: 'mixamorig:HandMiddle3',
  },
  ring: {
    proximal: 'mixamorig:HandRing1',
    intermediate: 'mixamorig:HandRing2',
    distal: 'mixamorig:HandRing3',
  },
  pinky: {
    proximal: 'mixamorig:HandPinky1',
    intermediate: 'mixamorig:HandPinky2',
    distal: 'mixamorig:HandPinky3',
  },
};

/**
 * FBX 손 모델 클래스
 */
export class HandModel {
  private model: THREE.Group | null = null;
  private bones: Map<string, THREE.Bone> = new Map();
  private boneMapping: HandBoneMapping;
  private side: 'left' | 'right';
  private initialRotations: Map<string, THREE.Euler> = new Map();

  constructor(side: 'left' | 'right' = 'right', boneMapping?: HandBoneMapping) {
    this.side = side;
    this.boneMapping = boneMapping || DEFAULT_BONE_MAPPING;
  }

  /**
   * FBX 모델 로드
   */
  async load(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      const loader = new FBXLoader();

      loader.load(
        url,
        (fbx) => {
          this.model = fbx;

          // 스케일 조정 (FBX는 보통 cm 단위)
          fbx.scale.setScalar(0.01);

          // 뼈대 찾기 및 저장
          fbx.traverse((child) => {
            if (child instanceof THREE.Bone) {
              this.bones.set(child.name, child);
              // 초기 회전값 저장
              this.initialRotations.set(child.name, child.rotation.clone());
            }
          });

          console.log('[HandModel] Loaded bones:', Array.from(this.bones.keys()));
          resolve(fbx);
        },
        (progress) => {
          console.log('[HandModel] Loading:', (progress.loaded / progress.total) * 100, '%');
        },
        (error) => {
          console.error('[HandModel] Load error:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 모델 반환
   */
  getModel(): THREE.Group | null {
    return this.model;
  }

  /**
   * 뼈대 이름 자동 감지 및 매핑 업데이트
   */
  autoDetectBoneMapping(): void {
    const boneNames = Array.from(this.bones.keys());

    // Mixamo 스타일 감지
    if (boneNames.some((name) => name.includes('mixamorig'))) {
      console.log('[HandModel] Detected Mixamo bone naming');
      this.boneMapping = MIXAMO_BONE_MAPPING;
      return;
    }

    // 일반적인 이름 패턴 감지
    const patterns = {
      thumb: ['thumb', 'Thumb', 'THUMB'],
      index: ['index', 'Index', 'INDEX', 'fore', 'Fore'],
      middle: ['middle', 'Middle', 'MIDDLE', 'mid', 'Mid'],
      ring: ['ring', 'Ring', 'RING'],
      pinky: ['pinky', 'Pinky', 'PINKY', 'little', 'Little'],
    };

    // 각 손가락별로 뼈대 찾기
    Object.entries(patterns).forEach(([finger, keywords]) => {
      const fingerBones = boneNames.filter((name) =>
        keywords.some((kw) => name.includes(kw))
      );

      if (fingerBones.length > 0) {
        console.log(`[HandModel] Found ${finger} bones:`, fingerBones);
      }
    });
  }

  /**
   * MediaPipe 랜드마크로 손 포즈 업데이트
   */
  updateFromLandmarks(landmarks: HandLandmarkPoint[], mirror: boolean = true): void {
    if (!this.model || landmarks.length < 21) return;

    // 손목 위치 및 회전 설정
    const wrist = landmarks[HandLandmarkIndex.WRIST];
    const middleMcp = landmarks[HandLandmarkIndex.MIDDLE_MCP];

    // 손 전체 방향 계산 (향후 손 회전 애니메이션에 사용 예정)
    const _handDirection = new THREE.Vector3(
      middleMcp.x - wrist.x,
      -(middleMcp.y - wrist.y), // Y축 반전
      middleMcp.z - wrist.z
    ).normalize();

    // 모델 위치 업데이트 (선택적)
    // this.model.position.set(
    //   (mirror ? 1 - wrist.x : wrist.x) * 2 - 1,
    //   -wrist.y * 2 + 1,
    //   -wrist.z
    // );

    // 각 손가락 업데이트
    this.updateFinger('thumb', [
      HandLandmarkIndex.THUMB_CMC,
      HandLandmarkIndex.THUMB_MCP,
      HandLandmarkIndex.THUMB_IP,
      HandLandmarkIndex.THUMB_TIP,
    ], landmarks, mirror);

    this.updateFinger('index', [
      HandLandmarkIndex.INDEX_MCP,
      HandLandmarkIndex.INDEX_PIP,
      HandLandmarkIndex.INDEX_DIP,
      HandLandmarkIndex.INDEX_TIP,
    ], landmarks, mirror);

    this.updateFinger('middle', [
      HandLandmarkIndex.MIDDLE_MCP,
      HandLandmarkIndex.MIDDLE_PIP,
      HandLandmarkIndex.MIDDLE_DIP,
      HandLandmarkIndex.MIDDLE_TIP,
    ], landmarks, mirror);

    this.updateFinger('ring', [
      HandLandmarkIndex.RING_MCP,
      HandLandmarkIndex.RING_PIP,
      HandLandmarkIndex.RING_DIP,
      HandLandmarkIndex.RING_TIP,
    ], landmarks, mirror);

    this.updateFinger('pinky', [
      HandLandmarkIndex.PINKY_MCP,
      HandLandmarkIndex.PINKY_PIP,
      HandLandmarkIndex.PINKY_DIP,
      HandLandmarkIndex.PINKY_TIP,
    ], landmarks, mirror);
  }

  /**
   * 개별 손가락 업데이트
   */
  private updateFinger(
    fingerName: keyof Omit<HandBoneMapping, 'wrist'>,
    landmarkIndices: number[],
    landmarks: HandLandmarkPoint[],
    mirror: boolean
  ): void {
    const fingerMapping = this.boneMapping[fingerName];
    const boneKeys = ['proximal', 'intermediate', 'distal'] as const;

    for (let i = 0; i < boneKeys.length && i < landmarkIndices.length - 1; i++) {
      const boneName = fingerMapping[boneKeys[i] as keyof typeof fingerMapping];
      if (!boneName) continue;

      const bone = this.findBone(boneName);
      if (!bone) continue;

      // 두 랜드마크 사이의 방향 벡터 계산
      const current = landmarks[landmarkIndices[i]];
      const next = landmarks[landmarkIndices[i + 1]];

      if (!current || !next) continue;

      // 굽힘 각도 계산 (간단한 버전)
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const dz = next.z - current.z;

      // X축 회전 (굽힘) - Y 차이 기반
      const bendAngle = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));

      // Z축 회전 (좌우 벌림) - X 차이 기반
      const spreadAngle = Math.atan2(dx, dz) * (mirror ? -1 : 1);

      // 초기 회전값 가져오기
      const initialRot = this.initialRotations.get(bone.name);

      // 부드러운 보간 적용
      const dampening = 0.3;
      const targetX = (initialRot?.x || 0) + bendAngle * 2;
      const targetZ = (initialRot?.z || 0) + spreadAngle * 0.5;

      bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, targetX, dampening);
      bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, targetZ, dampening);
    }
  }

  /**
   * 뼈대 찾기 (부분 일치 지원)
   */
  private findBone(name: string): THREE.Bone | null {
    // 정확한 일치
    if (this.bones.has(name)) {
      return this.bones.get(name)!;
    }

    // 좌우 접두사 추가 시도
    const sidePrefix = this.side === 'left' ? 'Left' : 'Right';
    const sideVariants = [
      `${sidePrefix}${name}`,
      `${name}_${this.side}`,
      `${name}.${sidePrefix[0]}`,
      `${sidePrefix.toLowerCase()}_${name}`,
    ];

    for (const variant of sideVariants) {
      if (this.bones.has(variant)) {
        return this.bones.get(variant)!;
      }
    }

    // 부분 일치 검색
    for (const [boneName, bone] of this.bones) {
      if (boneName.toLowerCase().includes(name.toLowerCase())) {
        return bone;
      }
    }

    return null;
  }

  /**
   * 포즈 리셋 (초기 상태로)
   */
  reset(): void {
    this.initialRotations.forEach((rotation, boneName) => {
      const bone = this.bones.get(boneName);
      if (bone) {
        bone.rotation.copy(rotation);
      }
    });
  }

  /**
   * 모든 뼈대 이름 반환 (디버깅용)
   */
  getBoneNames(): string[] {
    return Array.from(this.bones.keys());
  }

  /**
   * 뼈대 매핑 설정
   */
  setBoneMapping(mapping: HandBoneMapping): void {
    this.boneMapping = mapping;
  }
}

/**
 * 손 모델 로더 싱글톤
 */
let leftHandModel: HandModel | null = null;
let rightHandModel: HandModel | null = null;

export async function loadHandModel(
  url: string,
  side: 'left' | 'right' = 'right'
): Promise<HandModel> {
  const model = new HandModel(side);
  await model.load(url);
  model.autoDetectBoneMapping();

  if (side === 'left') {
    leftHandModel = model;
  } else {
    rightHandModel = model;
  }

  return model;
}

export function getHandModel(side: 'left' | 'right'): HandModel | null {
  return side === 'left' ? leftHandModel : rightHandModel;
}
