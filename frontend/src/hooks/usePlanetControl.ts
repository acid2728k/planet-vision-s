import { useState, useEffect, useRef } from 'react';
import { NormalizedLandmarkList } from '@mediapipe/hands';
import { HandData, PlanetControlState, PlanetType } from '../types';
import { processGestureControl, GestureControlInput } from '../services/gestureController';
import { getNextPlanet, getPreviousPlanet } from '../data/planets';
import { landmarkToPoint } from '../utils/mathUtils';

const LANDMARKS = {
  INDEX_TIP: 8,
  WRIST: 0,
} as const;

interface UsePlanetControlProps {
  handData: HandData | null;
  landmarks: NormalizedLandmarkList[];
}

const INITIAL_STATE: PlanetControlState = {
  zoom: 1.0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  currentPlanet: 'SATURN',
};

export function usePlanetControl({ handData, landmarks }: UsePlanetControlProps) {
  const [controlState, setControlState] = useState<PlanetControlState>(INITIAL_STATE);
  
  // Храним предыдущие значения для вычисления дельт
  const previousIndexTipRef = useRef<{ x: number; y: number; z: number } | undefined>(undefined);
  const previousOrientationRef = useRef<{ heading: number; pitch: number; roll: number } | undefined>(undefined);
  const previousWristRef = useRef<{ x: number; y: number; z: number } | undefined>(undefined);
  const previousTimestampRef = useRef<number | undefined>(undefined);
  const lastSwipeTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false); // Флаг для предотвращения параллельной обработки
  const SWIPE_COOLDOWN = 300; // Минимальное время между swipe (мс) - уменьшено с 500

  useEffect(() => {
    // Предотвращаем параллельную обработку
    if (isProcessingRef.current) {
      return;
    }

    if (!handData || landmarks.length === 0) {
      // Нет руки - сбрасываем предыдущие значения
      previousIndexTipRef.current = undefined;
      previousOrientationRef.current = undefined;
      previousWristRef.current = undefined;
      previousTimestampRef.current = undefined;
      isProcessingRef.current = false;
      return;
    }

    isProcessingRef.current = true;

    const currentTimestamp = Date.now();
    const mainHandLandmarks = landmarks[0];
    const indexTip = landmarkToPoint(mainHandLandmarks[LANDMARKS.INDEX_TIP]);
    const wrist = landmarkToPoint(mainHandLandmarks[LANDMARKS.WRIST]);

    // Подготавливаем входные данные для gestureController
    const input: GestureControlInput = {
      landmarks: mainHandLandmarks,
      orientation: handData.orientation,
      pinch: handData.pinch,
      fingerExtension: handData.fingerExtension,
      previousIndexTip: previousIndexTipRef.current,
      previousOrientation: previousOrientationRef.current,
      previousWrist: previousWristRef.current,
    };

    // Обрабатываем жесты - используем функциональное обновление для избежания проблем с зависимостями
    setControlState((prev) => {
      const output = processGestureControl(
        input,
        prev,
        currentTimestamp,
        previousTimestampRef.current
      );

      // Накопление углов вращения
      const newRotationX = prev.rotationX + output.rotationX;
      const newRotationY = prev.rotationY + output.rotationY;
      const newRotationZ = prev.rotationZ + output.rotationZ;
      
      const newState: PlanetControlState = {
        zoom: output.zoom,
        rotationX: newRotationX,
        rotationY: newRotationY,
        rotationZ: newRotationZ,
        currentPlanet: prev.currentPlanet,
      };

      // Обрабатываем swipe для переключения спутников
      // Переключение работает ТОЛЬКО при разжатой кисти (avgExtension > 0.3)
      const avgExtension = (
        handData.fingerExtension.index +
        handData.fingerExtension.middle +
        handData.fingerExtension.ring +
        handData.fingerExtension.pinky
      ) / 4;
      
      // Упростили условия: снизили пороги для лучшей отзывчивости
      if (output.swipe.direction !== 'none' && output.swipe.velocity > 0.02 && avgExtension > 0.3) {
        const now = Date.now();
        const timeSinceLastSwipe = now - lastSwipeTimeRef.current;
        
        if (timeSinceLastSwipe > SWIPE_COOLDOWN) {
          lastSwipeTimeRef.current = now;
          
          console.log('✅ Planet switch triggered:', {
            direction: output.swipe.direction,
            velocity: output.swipe.velocity,
            avgExtension,
            from: prev.currentPlanet,
            timeSinceLastSwipe,
          });
          
          if (output.swipe.direction === 'right') {
            newState.currentPlanet = getNextPlanet(prev.currentPlanet);
            console.log('→ Next planet:', newState.currentPlanet);
          } else if (output.swipe.direction === 'left') {
            newState.currentPlanet = getPreviousPlanet(prev.currentPlanet);
            console.log('← Previous planet:', newState.currentPlanet);
          }
        }
      }

      // Сохраняем текущие значения для следующего кадра
      previousIndexTipRef.current = indexTip;
      previousOrientationRef.current = {
        heading: handData.orientation.heading,
        pitch: handData.orientation.pitch,
        roll: handData.orientation.roll,
      };
      previousWristRef.current = wrist;
      previousTimestampRef.current = currentTimestamp;

      return newState;
    });

    // Сбрасываем флаг обработки после завершения через requestAnimationFrame
    requestAnimationFrame(() => {
      isProcessingRef.current = false;
    });
  }, [handData, landmarks]);

  // Функция для сброса вращения (можно использовать для калибровки)
  const resetRotation = () => {
    setControlState((prev) => ({
      ...prev,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    }));
  };

  // Функция для установки конкретной планеты
  const setPlanet = (planet: PlanetType) => {
    setControlState((prev) => ({
      ...prev,
      currentPlanet: planet,
    }));
  };

  return {
    controlState,
    resetRotation,
    setPlanet,
  };
}

