import { NormalizedLandmarkList } from "@mediapipe/hands";
import { FingerExtension, HandOrientation, PinchData } from "../types";
import {
  distance2D,
  distance3D,
  angleBetweenPoints,
  normalize,
  calculateNormal,
  calculateHeading,
  landmarkToPoint,
} from "../utils/mathUtils";
import { GESTURE_THRESHOLDS } from "../utils/constants";

// MediaPipe Hand Landmark indices
const LANDMARKS = {
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

export function calculateFingerExtension(
  landmarks: NormalizedLandmarkList
): FingerExtension {
  const wrist = landmarkToPoint(landmarks[LANDMARKS.WRIST]);

  // Calculate extension based on distance from tip to wrist
  // Extended finger = longer distance, bent finger = shorter distance
  // Улучшенный расчет для более симметричной реакции всех пальцев
  const getFingerExtension = (mcp: number, tip: number): number => {
    const mcpPoint = landmarkToPoint(landmarks[mcp]);
    const tipPoint = landmarkToPoint(landmarks[tip]);

    // Distance from tip to wrist (normalized)
    const tipToWrist = distance3D(tipPoint, wrist);
    // Distance from MCP to wrist (baseline)
    const mcpToWrist = distance3D(mcpPoint, wrist);

    // Улучшенная формула для более плавной и симметричной реакции
    // Используем более широкий диапазон для лучшей чувствительности
    const extension = Math.min(
      1,
      Math.max(0, (tipToWrist - mcpToWrist * 0.4) / (mcpToWrist * 1.0))
    );

    // Применяем множитель для увеличения чувствительности (как у thumb)
    return Math.min(1, extension * 1.2);
  };

  // Thumb uses the same calculation as other fingers with MCP
  // Используем точно такую же логику, как для остальных пальцев
  // Для большого пальца используем MCP, как и для остальных
  return {
    thumb: getFingerExtension(LANDMARKS.THUMB_MCP, LANDMARKS.THUMB_TIP),
    index: getFingerExtension(LANDMARKS.INDEX_MCP, LANDMARKS.INDEX_TIP),
    middle: getFingerExtension(LANDMARKS.MIDDLE_MCP, LANDMARKS.MIDDLE_TIP),
    ring: getFingerExtension(LANDMARKS.RING_MCP, LANDMARKS.RING_TIP),
    pinky: getFingerExtension(LANDMARKS.PINKY_MCP, LANDMARKS.PINKY_TIP),
  };
}

export function calculateOrientation(
  landmarks: NormalizedLandmarkList
): HandOrientation {
  // Use palm points to calculate normal vector
  const wrist = landmarkToPoint(landmarks[LANDMARKS.WRIST]);
  const indexMcp = landmarkToPoint(landmarks[LANDMARKS.INDEX_MCP]);
  const pinkyMcp = landmarkToPoint(landmarks[LANDMARKS.PINKY_MCP]);

  const normal = calculateNormal(wrist, indexMcp, pinkyMcp);
  const heading = calculateHeading(normal);

  // Calculate pitch and roll (simplified)
  const pitch = Math.asin(normal.y) * (180 / Math.PI);
  const roll = Math.atan2(normal.x, normal.z) * (180 / Math.PI);

  return {
    heading,
    pitch,
    roll,
  };
}

export function calculatePinch(
  landmarks: NormalizedLandmarkList,
  previousHistory: number[] = []
): PinchData {
  const thumbTip = landmarkToPoint(landmarks[LANDMARKS.THUMB_TIP]);
  const indexTip = landmarkToPoint(landmarks[LANDMARKS.INDEX_TIP]);

  const distance = distance2D(thumbTip, indexTip);
  const strength =
    1 - normalize(distance, 0, GESTURE_THRESHOLDS.PINCH_DISTANCE);

  const history = [...previousHistory, strength];
  if (history.length > 50) {
    history.shift();
  }

  return {
    strength,
    distance,
    history,
  };
}

/**
 * Вычисляет скорость движения указательного пальца
 */
export function calculateIndexTipVelocity(
  currentLandmarks: NormalizedLandmarkList,
  previousLandmarks: NormalizedLandmarkList | undefined,
  deltaTime: number
): { velocity: number; direction: { x: number; y: number } } {
  if (!previousLandmarks || deltaTime <= 0) {
    return { velocity: 0, direction: { x: 0, y: 0 } };
  }

  const currentTip = landmarkToPoint(currentLandmarks[LANDMARKS.INDEX_TIP]);
  const previousTip = landmarkToPoint(previousLandmarks[LANDMARKS.INDEX_TIP]);

  const deltaX = currentTip.x - previousTip.x;
  const deltaY = currentTip.y - previousTip.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const velocity = distance / deltaTime;

  return {
    velocity,
    direction: { x: deltaX, y: deltaY },
  };
}

/**
 * Вычисляет скорость движения запястья (для swipe detection)
 */
export function calculateWristVelocity(
  currentLandmarks: NormalizedLandmarkList,
  previousLandmarks: NormalizedLandmarkList | undefined,
  deltaTime: number
): { velocity: number; horizontalVelocity: number; direction: 'left' | 'right' | 'none' } {
  if (!previousLandmarks || deltaTime <= 0) {
    return { velocity: 0, horizontalVelocity: 0, direction: 'none' };
  }

  const currentWrist = landmarkToPoint(currentLandmarks[LANDMARKS.WRIST]);
  const previousWrist = landmarkToPoint(previousLandmarks[LANDMARKS.WRIST]);

  const deltaX = currentWrist.x - previousWrist.x;
  const deltaY = currentWrist.y - previousWrist.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const velocity = distance / deltaTime;
  const horizontalVelocity = Math.abs(deltaX / deltaTime);

  let direction: 'left' | 'right' | 'none' = 'none';
  if (Math.abs(deltaX) > 0.01) {
    direction = deltaX > 0 ? 'right' : 'left';
  }

  return {
    velocity,
    horizontalVelocity,
    direction,
  };
}
