/**
 * 개별 관절 ROM 보정 페이지
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CalibrationGuide, type CalibrationResult, type CalibrationJoint } from '@/components/calibration/CalibrationGuide';
import { calibrationService } from '@/services/calibrationService';
import { useAuthStore } from '@/stores/useAuthStore';
import { WebCamera } from '@/components/camera/WebCamera';
import type { Landmark } from '@/types/pose';

// 유효한 관절 타입 확인
const VALID_JOINTS: CalibrationJoint[] = [
  'shoulder_flexion',
  'shoulder_abduction',
  'elbow_flexion',
  'knee_flexion',
  'hip_flexion',
  'hip_abduction',
];

// 관절별 각도 계산 함수
function calculateJointAngle(joint: CalibrationJoint, landmarks: Landmark[]): number {
  // 랜드마크 인덱스 (MediaPipe Pose)
  const indices = {
    shoulder_flexion: { a: 12, b: 14, c: 24 }, // 어깨-팔꿈치-엉덩이
    shoulder_abduction: { a: 14, b: 12, c: 24 }, // 팔꿈치-어깨-엉덩이
    elbow_flexion: { a: 12, b: 14, c: 16 }, // 어깨-팔꿈치-손목
    knee_flexion: { a: 24, b: 26, c: 28 }, // 엉덩이-무릎-발목
    hip_flexion: { a: 12, b: 24, c: 26 }, // 어깨-엉덩이-무릎
    hip_abduction: { a: 23, b: 24, c: 26 }, // 왼엉덩이-오른엉덩이-무릎
  };

  const { a, b, c } = indices[joint];

  if (!landmarks[a] || !landmarks[b] || !landmarks[c]) {
    return 0;
  }

  const pointA = landmarks[a];
  const pointB = landmarks[b];
  const pointC = landmarks[c];

  // 3D 벡터 계산
  const BA = {
    x: pointA.x - pointB.x,
    y: pointA.y - pointB.y,
    z: (pointA.z || 0) - (pointB.z || 0),
  };
  const BC = {
    x: pointC.x - pointB.x,
    y: pointC.y - pointB.y,
    z: (pointC.z || 0) - (pointB.z || 0),
  };

  // 내적
  const dotProduct = BA.x * BC.x + BA.y * BC.y + BA.z * BC.z;

  // 벡터 크기
  const magnitudeBA = Math.sqrt(BA.x ** 2 + BA.y ** 2 + BA.z ** 2);
  const magnitudeBC = Math.sqrt(BC.x ** 2 + BC.y ** 2 + BC.z ** 2);

  if (magnitudeBA === 0 || magnitudeBC === 0) return 0;

  // 각도 계산
  const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRad = Math.acos(clampedCos);
  const angleDeg = (angleRad * 180) / Math.PI;

  return Math.round(angleDeg * 10) / 10;
}

export default function JointCalibrationPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();

  const joint = params.joint as CalibrationJoint;
  const isValidJoint = VALID_JOINTS.includes(joint);

  const [currentAngle, setCurrentAngle] = useState(0);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const landmarksRef = useRef<Landmark[]>([]);

  // 잘못된 관절인 경우 리다이렉트
  useEffect(() => {
    if (!isValidJoint) {
      router.replace('/calibration');
    }
  }, [isValidJoint, router]);

  // 포즈 업데이트 처리
  const handlePoseUpdate = useCallback((newLandmarks: Landmark[]) => {
    landmarksRef.current = newLandmarks;
    setLandmarks(newLandmarks);

    if (isValidJoint) {
      const angle = calculateJointAngle(joint, newLandmarks);
      setCurrentAngle(angle);
    }
  }, [joint, isValidJoint]);

  // 보정 완료 처리
  const handleComplete = useCallback(async (result: CalibrationResult) => {
    await calibrationService.saveCalibration(result, user?.id);
    setIsComplete(true);

    // 2초 후 목록으로 이동
    setTimeout(() => {
      router.push('/calibration');
    }, 2000);
  }, [user?.id, router]);

  // 취소 처리
  const handleCancel = useCallback(() => {
    router.push('/calibration');
  }, [router]);

  if (!isValidJoint) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* 카메라 뷰 (배경) */}
      <div className="absolute inset-0">
        <WebCamera
          onPoseDetected={(landmarks) => {
            if (landmarks) {
              handlePoseUpdate(landmarks);
            }
          }}
          showSkeleton={true}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 보정 가이드 오버레이 */}
      {!isComplete && (
        <CalibrationGuide
          joint={joint}
          currentAngle={currentAngle}
          landmarks={landmarks}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
