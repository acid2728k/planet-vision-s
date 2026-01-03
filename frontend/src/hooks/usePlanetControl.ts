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
  
  // Логируем изменения currentPlanet
  useEffect(() => {
    console.log('📡 usePlanetControl: controlState.currentPlanet =', controlState.currentPlanet);
  }, [controlState.currentPlanet]);
  
  // Храним предыдущие значения для вычисления дельт
  const previousIndexTipRef = useRef<{ x: number; y: number; z: number } | undefined>(undefined);
  const previousOrientationRef = useRef<{ heading: number; pitch: number; roll: number } | undefined>(undefined);
  const previousWristRef = useRef<{ x: number; y: number; z: number } | undefined>(undefined);
  const previousTimestampRef = useRef<number | undefined>(undefined);
  const lastSwipeTimeRef = useRef<number>(0);
  const SWIPE_COOLDOWN = 150; // Минимальное время между swipe (мс) - уменьшено для максимальной отзывчивости

  useEffect(() => {
    if (!handData || landmarks.length === 0) {
      // Нет руки - сбрасываем предыдущие значения
      previousIndexTipRef.current = undefined;
      previousOrientationRef.current = undefined;
      previousWristRef.current = undefined;
      previousTimestampRef.current = undefined;
      return;
    }

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
        currentPlanet: prev.currentPlanet, // Начинаем с предыдущей планеты
      };
      
      console.log('🔄 usePlanetControl setState called:', {
        prevPlanet: prev.currentPlanet,
        newStatePlanet: newState.currentPlanet,
        swipeDirection: output.swipe.direction,
        swipeVelocity: output.swipe.velocity,
      });

      // Обрабатываем swipe для переключения спутников
      // Упрощенная логика: переключение работает при любом обнаруженном свайпе
      const hasSwipe = output.swipe.direction !== 'none';
      const hasVelocity = output.swipe.velocity > 0.005; // Очень низкий порог для максимальной отзывчивости
      
      // Логируем все свайпы для отладки
      if (hasSwipe) {
        console.log('🔍 Swipe detected:', {
          direction: output.swipe.direction,
          velocity: output.swipe.velocity,
          hasVelocity,
        });
      }
      
      // Упрощенное условие: переключаем планету при любом обнаруженном свайпе с минимальной скоростью
      if (hasSwipe && hasVelocity) {
        const now = Date.now();
        const timeSinceLastSwipe = now - lastSwipeTimeRef.current;
        
        if (timeSinceLastSwipe > SWIPE_COOLDOWN) {
          lastSwipeTimeRef.current = now;
          
          console.log('✅ Planet switch triggered:', {
            direction: output.swipe.direction,
            velocity: output.swipe.velocity,
            from: prev.currentPlanet,
            timeSinceLastSwipe,
          });
          
          if (output.swipe.direction === 'right') {
            const nextPlanet = getNextPlanet(prev.currentPlanet);
            newState.currentPlanet = nextPlanet;
            console.log('→ Next planet:', nextPlanet, 'from', prev.currentPlanet);
          } else if (output.swipe.direction === 'left') {
            const prevPlanet = getPreviousPlanet(prev.currentPlanet);
            newState.currentPlanet = prevPlanet;
            console.log('← Previous planet:', prevPlanet, 'from', prev.currentPlanet);
          }
          
          // Логируем финальное состояние для отладки
          console.log('📊 New controlState.currentPlanet:', newState.currentPlanet);
          console.log('📦 Returning newState with planet:', newState.currentPlanet);
        } else {
          console.log('⏱️ Swipe cooldown active:', {
            timeSinceLastSwipe,
            cooldown: SWIPE_COOLDOWN,
            remaining: SWIPE_COOLDOWN - timeSinceLastSwipe,
          });
        }
      } else if (hasSwipe && !hasVelocity) {
        console.log('⚠️ Swipe detected but velocity too low:', {
          direction: output.swipe.direction,
          velocity: output.swipe.velocity,
          threshold: 0.005,
        });
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

      console.log('✅ Returning state from setControlState:', {
        planet: newState.currentPlanet,
        zoom: newState.zoom,
        rotationX: newState.rotationX,
      });

      return newState;
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

