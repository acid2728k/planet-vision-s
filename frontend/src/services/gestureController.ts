import { NormalizedLandmarkList } from '@mediapipe/hands';
import { HandOrientation, PinchData, PlanetControlState, SwipeDirection, FingerExtension } from '../types';
import { landmarkToPoint, Point3D } from '../utils/mathUtils';

const LANDMARKS = {
  INDEX_TIP: 8,
  WRIST: 0,
} as const;

// Константы для управления
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_SMOOTHING = 0.04; // Плавность зума
const HAND_DISTANCE_ZOOM_SMOOTHING = 0.02; // Более плавный зум при приближении зажатой кисти
const HAND_DISTANCE_ZOOM_SENSITIVITY = 0.3; // Чувствительность зума от расстояния
const ROTATION_SENSITIVITY = 3.0; // Множитель для вращения пальцем (увеличено)
const ROTATION_SMOOTHING = 0.1; // Плавность вращения пальцем (увеличено)
const HAND_MOVEMENT_SENSITIVITY = 4.0; // Множитель для вращения движением ладони (увеличено)
const HAND_MOVEMENT_SMOOTHING = 0.12; // Плавность вращения движением ладони (увеличено)
const HAND_ROTATION_SENSITIVITY = 0.5; // Множитель для вращения ориентацией кисти (увеличено)
const HAND_ROTATION_SMOOTHING = 0.08; // Плавность вращения ориентацией кисти (увеличено)
const SWIPE_THRESHOLD = 0.02; // Минимальная скорость для swipe (еще больше уменьшено)
const DEAD_ZONE = 0.5; // Минимальное изменение для вращения кистью (degrees) (уменьшено)

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
 * ВАЖНО: зум зависит ТОЛЬКО от fingerExtension, не от ориентации кисти
 * 
 * Дополнительно: при приближении зажатой кисти (уменьшение Z) добавляется плавный зум
 */
function calculateZoom(
  fingerExtension: FingerExtension, 
  currentZoom: number,
  currentWrist?: Point3D,
  previousWrist?: Point3D
): number {
  // Вычисляем среднее раскрытие всех пальцев (кроме большого)
  // Используем только fingerExtension, игнорируя ориентацию кисти
  const avgExtension = (
    fingerExtension.index +
    fingerExtension.middle +
    fingerExtension.ring +
    fingerExtension.pinky
  ) / 4;

  // Маппинг: раскрытая ладонь (1.0) -> zoom out (0.5x)
  //           схлопнутые пальцы (0.0) -> zoom in (2.0x)
  // Инвертируем: чем больше раскрытие, тем меньше zoom
  let targetZoom = ZOOM_MIN + (ZOOM_MAX - ZOOM_MIN) * (1 - avgExtension);
  
  // Дополнительный плавный зум при приближении зажатой кисти
  // Работает только когда пальцы схлопнуты (avgExtension < 0.3)
  if (avgExtension < 0.3 && currentWrist && previousWrist) {
    // Вычисляем изменение глубины (Z координата)
    // В MediaPipe: меньше Z = ближе к камере
    const deltaZ = previousWrist.z - currentWrist.z; // Положительное = приближение
    
    if (deltaZ > 0) {
      // Кисть приближается - добавляем дополнительный зум
      // Чем больше приближение, тем больше зум
      const distanceZoom = deltaZ * HAND_DISTANCE_ZOOM_SENSITIVITY;
      targetZoom += distanceZoom;
      
      console.log('🔍 Distance zoom:', {
        deltaZ,
        distanceZoom,
        avgExtension,
        targetZoom,
      });
    }
  }
  
  const clampedZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, targetZoom));
  
  // Плавная интерполяция (более плавная при приближении зажатой кисти)
  const smoothing = avgExtension < 0.3 ? HAND_DISTANCE_ZOOM_SMOOTHING : ZOOM_SMOOTHING;
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

  // Ограничиваем скорость вращения и применяем плавность
  const maxRotation = 5.0; // градусов за кадр (увеличено для лучшей реакции)
  return {
    rotationX: Math.max(-maxRotation, Math.min(maxRotation, rotationX)) * ROTATION_SMOOTHING,
    rotationY: Math.max(-maxRotation, Math.min(maxRotation, rotationY)) * ROTATION_SMOOTHING,
  };
}

/**
 * Вычисляет вращение на основе движения всей ладони (запястья)
 * Более быстрое вращение, чем движение пальцем
 * ВАЖНО: это вращение НЕ влияет на зум
 * Во время зум-ина (схлопнутые пальцы) чувствительность увеличивается
 */
function calculateHandMovementRotation(
  currentWrist: Point3D,
  previousWrist: Point3D | undefined,
  fingerExtension?: FingerExtension
): { rotationX: number; rotationY: number } {
  if (!previousWrist) {
    return { rotationX: 0, rotationY: 0 };
  }

  // Вычисляем дельту движения запястья
  const deltaX = currentWrist.x - previousWrist.x;
  const deltaY = currentWrist.y - previousWrist.y;

  // Увеличиваем чувствительность во время зум-ина (схлопнутые пальцы)
  let sensitivityMultiplier = 1.0;
  if (fingerExtension) {
    const avgExtension = (
      fingerExtension.index +
      fingerExtension.middle +
      fingerExtension.ring +
      fingerExtension.pinky
    ) / 4;
    // Если пальцы схлопнуты (avgExtension < 0.3), увеличиваем чувствительность
    if (avgExtension < 0.3) {
      // Чем больше схлопнуты пальцы, тем больше чувствительность (до 2.5x)
      sensitivityMultiplier = 1.0 + (0.3 - avgExtension) * 5.0; // 0.3 -> 1.0, 0.0 -> 2.5
    }
  }

  // Преобразуем в углы вращения (более быстрое, чем движение пальцем)
  const rotationY = -deltaX * HAND_MOVEMENT_SENSITIVITY * sensitivityMultiplier * 180;
  const rotationX = deltaY * HAND_MOVEMENT_SENSITIVITY * sensitivityMultiplier * 180;

  // Ограничиваем скорость вращения и применяем плавность
  const maxRotation = 8.0 * sensitivityMultiplier; // градусов за кадр (увеличено для лучшей реакции)
  return {
    rotationX: Math.max(-maxRotation, Math.min(maxRotation, rotationX)) * HAND_MOVEMENT_SMOOTHING,
    rotationY: Math.max(-maxRotation, Math.min(maxRotation, rotationY)) * HAND_MOVEMENT_SMOOTHING,
  };
}

/**
 * Вычисляет вращение на основе ориентации ладони
 * ВАЖНО: это вращение НЕ влияет на зум, только на вращение планеты
 * Во время зум-ина (схлопнутые пальцы) чувствительность увеличивается
 */
function calculateHandRotation(
  currentOrientation: HandOrientation,
  previousOrientation: HandOrientation | undefined,
  fingerExtension?: FingerExtension
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

  // Увеличиваем чувствительность во время зум-ина (схлопнутые пальцы)
  let sensitivityMultiplier = 1.0;
  if (fingerExtension) {
    const avgExtension = (
      fingerExtension.index +
      fingerExtension.middle +
      fingerExtension.ring +
      fingerExtension.pinky
    ) / 4;
    // Если пальцы схлопнуты (avgExtension < 0.3), увеличиваем чувствительность
    if (avgExtension < 0.3) {
      // Чем больше схлопнуты пальцы, тем больше чувствительность (до 3x)
      sensitivityMultiplier = 1.0 + (0.3 - avgExtension) * 6.67; // 0.3 -> 1.0, 0.0 -> 3.0
    }
  }

  // Маппинг изменений ориентации в вращение модели с плавностью
  // heading -> rotationY (вращение вокруг вертикальной оси)
  // roll -> rotationZ (вращение вокруг оси Z)
  // pitch -> rotationX (вращение вокруг оси X)
  // ВАЖНО: это НЕ влияет на зум, только на вращение
  return {
    rotationX: applyDeadZone(deltaPitch * HAND_ROTATION_SENSITIVITY * sensitivityMultiplier) * HAND_ROTATION_SMOOTHING,
    rotationY: applyDeadZone(deltaHeading * HAND_ROTATION_SENSITIVITY * sensitivityMultiplier) * HAND_ROTATION_SMOOTHING,
    rotationZ: applyDeadZone(deltaRoll * HAND_ROTATION_SENSITIVITY * sensitivityMultiplier * 0.5) * HAND_ROTATION_SMOOTHING,
  };
}

/**
 * Детектирует swipe жесты для переключения планет
 * Улучшенная версия с более чувствительным обнаружением
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
  if (deltaTime <= 0 || deltaTime > 0.5) {
    // Игнорируем слишком большие интервалы (возможно, рука исчезла)
    return { direction: 'none', velocity: 0 };
  }

  // Вычисляем горизонтальное движение (по оси X)
  const deltaX = currentWrist.x - previousWrist.x;
  const absDeltaX = Math.abs(deltaX);
  
  // Вычисляем скорость
  const velocity = absDeltaX / deltaTime;

  // Проверяем минимальное расстояние движения (чтобы избежать ложных срабатываний от дрожания)
  const MIN_DISTANCE = 0.01; // Минимальное горизонтальное движение (уменьшено)
  
  // Проверяем, превышает ли скорость порог И движение достаточно большое
  if (velocity < SWIPE_THRESHOLD || absDeltaX < MIN_DISTANCE) {
    return { direction: 'none', velocity: 0 };
  }
  
  // Логируем для отладки
  if (velocity > 0.01) {
    console.log('Swipe detection:', {
      deltaX,
      absDeltaX,
      velocity,
      deltaTime,
      threshold: SWIPE_THRESHOLD,
      minDistance: MIN_DISTANCE,
    });
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
  // Передаем fingerExtension для увеличения чувствительности во время зум-ина
  const handMovementRotation = calculateHandMovementRotation(wrist, input.previousWrist, input.fingerExtension);

  // Вращение ориентацией кисти (тонкое)
  // Передаем fingerExtension для увеличения чувствительности во время зум-ина
  const handOrientationRotation = calculateHandRotation(input.orientation, input.previousOrientation, input.fingerExtension);

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

