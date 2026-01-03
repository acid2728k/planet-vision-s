import { NormalizedLandmarkList } from '@mediapipe/hands';
import { HandOrientation, PinchData, PlanetControlState, SwipeDirection } from '../types';
import { landmarkToPoint, Point3D, distance2D } from '../utils/mathUtils';

const LANDMARKS = {
  INDEX_TIP: 8,
  WRIST: 0,
} as const;

// Константы для управления
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_SENSITIVITY = 1.2; // Множитель для pinch strength (уменьшено для более плавного зума)
const ROTATION_SENSITIVITY = 1.5; // Множитель для вращения пальцем (уменьшено для более плавного вращения)
const HAND_ROTATION_SENSITIVITY = 0.3; // Множитель для вращения кистью (уменьшено для более плавного вращения)
const SWIPE_THRESHOLD = 0.12; // Минимальная скорость для swipe (уменьшено для более чувствительного swipe)
const DEAD_ZONE = 1.5; // Минимальное изменение для вращения кистью (degrees) (уменьшено для более чувствительного управления)

export interface GestureControlInput {
  landmarks: NormalizedLandmarkList;
  orientation: HandOrientation;
  pinch: PinchData;
  previousIndexTip?: Point3D;
  previousOrientation?: HandOrientation;
  previousWrist?: Point3D;
}

export interface GestureControlOutput {
  zoom: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  swipe: SwipeDirection;
}

/**
 * Вычисляет zoom на основе pinch жеста
 */
function calculateZoom(pinch: PinchData, currentZoom: number): number {
  // Маппинг pinch.strength (0-1) в zoom (0.5x - 2.0x)
  // Когда pinch = 0 (пальцы разжаты) -> zoom = 0.5x
  // Когда pinch = 1 (пальцы сжаты) -> zoom = 2.0x
  const targetZoom = ZOOM_MIN + (ZOOM_MAX - ZOOM_MIN) * pinch.strength * ZOOM_SENSITIVITY;
  const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, targetZoom));
  
  // Плавная интерполяция для избежания рывков
  const smoothing = 0.15; // Увеличено для более плавного зума
  return currentZoom + (clampedZoom - currentZoom) * smoothing;
}

/**
 * Вычисляет вращение на основе движения указательного пальца
 */
function calculateFingerRotation(
  currentIndexTip: Point3D,
  previousIndexTip: Point3D | undefined
): { rotationX: number; rotationY: number } {
  if (!previousIndexTip) {
    return { rotationX: 0, rotationY: 0 };
  }

  // Вычисляем дельту движения
  const deltaX = currentIndexTip.x - previousIndexTip.x;
  const deltaY = currentIndexTip.y - previousIndexTip.y;

  // Преобразуем в углы вращения
  // Инвертируем для интуитивного управления (движение вправо -> вращение вправо)
  const rotationY = -deltaX * ROTATION_SENSITIVITY * 180;
  const rotationX = deltaY * ROTATION_SENSITIVITY * 180;

  // Ограничиваем скорость вращения
  const maxRotation = 3.0; // градусов за кадр (уменьшено для более плавного вращения)
  return {
    rotationX: Math.max(-maxRotation, Math.min(maxRotation, rotationX)),
    rotationY: Math.max(-maxRotation, Math.min(maxRotation, rotationY)),
  };
}

/**
 * Вычисляет вращение на основе ориентации ладони
 */
function calculateHandRotation(
  currentOrientation: HandOrientation,
  previousOrientation: HandOrientation | undefined
): { rotationX: number; rotationY: number; rotationZ: number } {
  if (!previousOrientation) {
    return { rotationX: 0, rotationY: 0, rotationZ: 0 };
  }

  // Вычисляем изменения ориентации
  let deltaHeading = currentOrientation.heading - previousOrientation.heading;
  // Обрабатываем переход через 360/0
  if (deltaHeading > 180) deltaHeading -= 360;
  if (deltaHeading < -180) deltaHeading += 360;

  const deltaRoll = currentOrientation.roll - previousOrientation.roll;
  const deltaPitch = currentOrientation.pitch - previousOrientation.pitch;

  // Применяем dead zone для избежания дрожания
  const applyDeadZone = (value: number) => {
    if (Math.abs(value) < DEAD_ZONE) return 0;
    return value;
  };

  // Маппинг изменений ориентации в вращение модели
  // heading -> rotationY (вращение вокруг вертикальной оси)
  // roll -> rotationZ (вращение вокруг оси Z)
  // pitch -> rotationX (вращение вокруг оси X)
  return {
    rotationX: applyDeadZone(deltaPitch * HAND_ROTATION_SENSITIVITY),
    rotationY: applyDeadZone(deltaHeading * HAND_ROTATION_SENSITIVITY),
    rotationZ: applyDeadZone(deltaRoll * HAND_ROTATION_SENSITIVITY * 0.5), // Меньшая чувствительность для roll
  };
}

/**
 * Детектирует swipe жесты для переключения планет
 */
function detectSwipe(
  currentWrist: Point3D,
  previousWrist: Point3D | undefined,
  timestamp: number,
  previousTimestamp: number | undefined
): SwipeDirection {
  if (!previousWrist || !previousTimestamp) {
    return { direction: 'none', velocity: 0 };
  }

  const deltaTime = (timestamp - previousTimestamp) / 1000; // в секундах
  if (deltaTime <= 0) {
    return { direction: 'none', velocity: 0 };
  }

  // Вычисляем горизонтальное движение (по оси X)
  const deltaX = currentWrist.x - previousWrist.x;
  const velocity = Math.abs(deltaX / deltaTime);

  // Проверяем, превышает ли скорость порог
  if (velocity < SWIPE_THRESHOLD) {
    return { direction: 'none', velocity: 0 };
  }

  // Определяем направление
  const direction = deltaX > 0 ? 'right' : 'left';
  return { direction, velocity };
}

/**
 * Основная функция для обработки жестов и вычисления управления планетой
 */
export function processGestureControl(
  input: GestureControlInput,
  currentState: PlanetControlState,
  timestamp: number,
  previousTimestamp?: number
): GestureControlOutput {
  const indexTip = landmarkToPoint(input.landmarks[LANDMARKS.INDEX_TIP]);
  const wrist = landmarkToPoint(input.landmarks[LANDMARKS.WRIST]);

  // Zoom через pinch
  const zoom = calculateZoom(input.pinch, currentState.zoom);

  // Вращение пальцем
  const fingerRotation = calculateFingerRotation(indexTip, input.previousIndexTip);

  // Вращение кистью
  const handRotation = calculateHandRotation(input.orientation, input.previousOrientation);

  // Swipe для переключения планет
  const swipe = detectSwipe(wrist, input.previousWrist, timestamp, previousTimestamp);

  // Комбинируем вращения (палец + кисть)
  return {
    zoom,
    rotationX: fingerRotation.rotationX + handRotation.rotationX,
    rotationY: fingerRotation.rotationY + handRotation.rotationY,
    rotationZ: handRotation.rotationZ,
    swipe,
  };
}

