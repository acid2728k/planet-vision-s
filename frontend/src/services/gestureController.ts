import { NormalizedLandmarkList } from '@mediapipe/hands';
import { HandOrientation, PinchData, PlanetControlState, SwipeDirection, FingerExtension } from '../types';
import { landmarkToPoint, Point3D, distance2D } from '../utils/mathUtils';

const LANDMARKS = {
  INDEX_TIP: 8,
  WRIST: 0,
} as const;

// Константы для управления
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_SMOOTHING = 0.04; // Плавность зума (уменьшено для еще большей плавности)
const ROTATION_SENSITIVITY = 1.0; // Множитель для вращения пальцем
const ROTATION_SMOOTHING = 0.06; // Плавность вращения пальцем
const HAND_MOVEMENT_SENSITIVITY = 2.5; // Множитель для вращения движением ладони (быстрее)
const HAND_MOVEMENT_SMOOTHING = 0.08; // Плавность вращения движением ладони
const HAND_ROTATION_SENSITIVITY = 0.2; // Множитель для вращения ориентацией кисти
const HAND_ROTATION_SMOOTHING = 0.05; // Плавность вращения ориентацией кисти
const SWIPE_THRESHOLD = 0.12; // Минимальная скорость для swipe
const DEAD_ZONE = 1.5; // Минимальное изменение для вращения кистью (degrees)

export interface GestureControlInput {
  landmarks: NormalizedLandmarkList;
  orientation: HandOrientation;
  pinch: PinchData;
  fingerExtension: FingerExtension;
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
 * Вычисляет zoom на основе раскрытия/схлопывания ладони
 * Раскрытая ладонь (OPEN) -> zoom out (уменьшение)
 * Схлопнутые пальцы (CLOSED) -> zoom in (увеличение)
 */
function calculateZoom(fingerExtension: FingerExtension, currentZoom: number): number {
  // Вычисляем среднее раскрытие всех пальцев (кроме большого)
  const avgExtension = (
    fingerExtension.index +
    fingerExtension.middle +
    fingerExtension.ring +
    fingerExtension.pinky
  ) / 4;

  // Маппинг: раскрытая ладонь (1.0) -> zoom out (0.5x)
  //           схлопнутые пальцы (0.0) -> zoom in (2.0x)
  // Инвертируем: чем больше раскрытие, тем меньше zoom
  const targetZoom = ZOOM_MIN + (ZOOM_MAX - ZOOM_MIN) * (1 - avgExtension);
  const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, targetZoom));
  
  // Плавная интерполяция
  return currentZoom + (clampedZoom - currentZoom) * ZOOM_SMOOTHING;
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

  // Ограничиваем скорость вращения и применяем плавность
  const maxRotation = 2.0; // градусов за кадр (уменьшено для плавности)
  return {
    rotationX: Math.max(-maxRotation, Math.min(maxRotation, rotationX)) * ROTATION_SMOOTHING,
    rotationY: Math.max(-maxRotation, Math.min(maxRotation, rotationY)) * ROTATION_SMOOTHING,
  };
}

/**
 * Вычисляет вращение на основе движения всей ладони (запястья)
 * Более быстрое вращение, чем движение пальцем
 */
function calculateHandMovementRotation(
  currentWrist: Point3D,
  previousWrist: Point3D | undefined
): { rotationX: number; rotationY: number } {
  if (!previousWrist) {
    return { rotationX: 0, rotationY: 0 };
  }

  // Вычисляем дельту движения запястья
  const deltaX = currentWrist.x - previousWrist.x;
  const deltaY = currentWrist.y - previousWrist.y;

  // Преобразуем в углы вращения (более быстрое, чем движение пальцем)
  const rotationY = -deltaX * HAND_MOVEMENT_SENSITIVITY * 180;
  const rotationX = deltaY * HAND_MOVEMENT_SENSITIVITY * 180;

  // Ограничиваем скорость вращения и применяем плавность
  const maxRotation = 4.0; // градусов за кадр (быстрее, чем движение пальцем)
  return {
    rotationX: Math.max(-maxRotation, Math.min(maxRotation, rotationX)) * HAND_MOVEMENT_SMOOTHING,
    rotationY: Math.max(-maxRotation, Math.min(maxRotation, rotationY)) * HAND_MOVEMENT_SMOOTHING,
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

  // Маппинг изменений ориентации в вращение модели с плавностью
  // heading -> rotationY (вращение вокруг вертикальной оси)
  // roll -> rotationZ (вращение вокруг оси Z)
  // pitch -> rotationX (вращение вокруг оси X)
  return {
    rotationX: applyDeadZone(deltaPitch * HAND_ROTATION_SENSITIVITY) * HAND_ROTATION_SMOOTHING,
    rotationY: applyDeadZone(deltaHeading * HAND_ROTATION_SENSITIVITY) * HAND_ROTATION_SMOOTHING,
    rotationZ: applyDeadZone(deltaRoll * HAND_ROTATION_SENSITIVITY * 0.5) * HAND_ROTATION_SMOOTHING,
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

  // Zoom через раскрытие/схлопывание ладони
  const zoom = calculateZoom(input.fingerExtension, currentState.zoom);

  // Вращение указательным пальцем (точное, медленное)
  const fingerRotation = calculateFingerRotation(indexTip, input.previousIndexTip);

  // Вращение движением всей ладони (быстрое)
  const handMovementRotation = calculateHandMovementRotation(wrist, input.previousWrist);

  // Вращение ориентацией кисти (тонкое)
  const handOrientationRotation = calculateHandRotation(input.orientation, input.previousOrientation);

  // Swipe для переключения планет
  const swipe = detectSwipe(wrist, input.previousWrist, timestamp, previousTimestamp);

  // Комбинируем все типы вращений
  // Движение ладони дает более быстрое вращение, палец - точное
  return {
    zoom,
    rotationX: fingerRotation.rotationX + handMovementRotation.rotationX + handOrientationRotation.rotationX,
    rotationY: fingerRotation.rotationY + handMovementRotation.rotationY + handOrientationRotation.rotationY,
    rotationZ: handOrientationRotation.rotationZ,
    swipe,
  };
}

