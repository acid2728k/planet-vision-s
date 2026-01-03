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
  const lastSwipeDirectionRef = useRef<'left' | 'right' | 'none'>('none');
  const lastPinchTimeRef = useRef<number>(0);
  const lastVerticalMovementTimeRef = useRef<number>(0);
  const previousPinchStrengthRef = useRef<number>(0);
  const lastPinchSwitchTimeRef = useRef<number>(0);
  const SWIPE_COOLDOWN = 150; // Минимальное время между swipe (мс) - уменьшено для максимальной отзывчивости
  const PINCH_COOLDOWN = 300; // Минимальное время между pinch переключениями
  const PINCH_SWITCH_COOLDOWN = 500; // Минимальное время между переключениями по простому pinch
  const VERTICAL_MOVEMENT_COOLDOWN = 200; // Минимальное время между вертикальными движениями
  const PINCH_THRESHOLD = 0.7; // Порог для определения pinch

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
      
      // ВАЖНО: Сохраняем текущую планету из предыдущего состояния
      // Это гарантирует, что если планета была изменена в предыдущем кадре,
      // мы не перезапишем это изменение
      let currentPlanet = prev.currentPlanet;
      
      const newState: PlanetControlState = {
        zoom: output.zoom,
        rotationX: newRotationX,
        rotationY: newRotationY,
        rotationZ: newRotationZ,
        currentPlanet: currentPlanet, // Начинаем с предыдущей планеты
      };
      
      console.log('🔄 usePlanetControl setState called:', {
        prevPlanet: prev.currentPlanet,
        newStatePlanet: newState.currentPlanet,
        swipeDirection: output.swipe.direction,
        swipeVelocity: output.swipe.velocity,
      });

      // ===== АЛЬТЕРНАТИВНЫЕ ЖЕСТЫ ДЛЯ ПЕРЕКЛЮЧЕНИЯ ПЛАНЕТ =====
      const now = Date.now();
      let planetSwitched = false;
      
      // ЖЕСТ 0: Простое соединение указательного и большого пальца (PINCH)
      const pinchStrength = handData.pinch.strength;
      const previousPinchStrength = previousPinchStrengthRef.current;
      const isPinching = pinchStrength > PINCH_THRESHOLD;
      const wasPinching = previousPinchStrength > PINCH_THRESHOLD;
      const pinchJustStarted = isPinching && !wasPinching; // Переход от не-pinch к pinch
      
      if (pinchJustStarted && !planetSwitched) {
        const timeSinceLastPinchSwitch = now - lastPinchSwitchTimeRef.current;
        if (timeSinceLastPinchSwitch > PINCH_SWITCH_COOLDOWN) {
          lastPinchSwitchTimeRef.current = now;
          
          // Определяем направление по движению руки в момент pinch
          let switchDirection: 'next' | 'previous' = 'next';
          if (previousWristRef.current) {
            const deltaX = wrist.x - previousWristRef.current.x;
            // Если рука движется влево в момент pinch - предыдущая планета, иначе следующая
            switchDirection = deltaX < -0.01 ? 'previous' : 'next';
          }
          
          console.log('✅ Planet switch (SIMPLE PINCH):', {
            pinchStrength,
            switchDirection,
            from: currentPlanet,
          });
          
          if (switchDirection === 'next') {
            currentPlanet = getNextPlanet(currentPlanet);
            newState.currentPlanet = currentPlanet;
            console.log('👆 Next planet:', currentPlanet);
          } else {
            currentPlanet = getPreviousPlanet(currentPlanet);
            newState.currentPlanet = currentPlanet;
            console.log('👈 Previous planet:', currentPlanet);
          }
          planetSwitched = true;
        }
      }
      
      // Сохраняем текущую силу pinch для следующего кадра
      previousPinchStrengthRef.current = pinchStrength;
      
      // ЖЕСТ 1: Pinch (схлопывание большого и указательного пальцев) + движение влево/вправо
      const hasSwipe = output.swipe.direction !== 'none';
      const hasVelocity = output.swipe.velocity > 0.005;
      
      if (isPinching && hasSwipe && hasVelocity) {
        const timeSinceLastPinch = now - lastPinchTimeRef.current;
        if (timeSinceLastPinch > PINCH_COOLDOWN) {
          lastPinchTimeRef.current = now;
          lastSwipeDirectionRef.current = output.swipe.direction;
          
          console.log('✅ Planet switch (PINCH + SWIPE):', {
            direction: output.swipe.direction,
            pinchStrength,
            from: currentPlanet,
          });
          
          if (output.swipe.direction === 'right') {
            currentPlanet = getNextPlanet(currentPlanet);
            newState.currentPlanet = currentPlanet;
            console.log('→ Next planet:', currentPlanet);
          } else if (output.swipe.direction === 'left') {
            currentPlanet = getPreviousPlanet(currentPlanet);
            newState.currentPlanet = currentPlanet;
            console.log('← Previous planet:', currentPlanet);
          }
          planetSwitched = true;
        }
      }
      
      // ЖЕСТ 2: Движение руки вверх/вниз (вертикальное движение)
      if (!planetSwitched && previousWristRef.current) {
        const deltaY = wrist.y - previousWristRef.current.y;
        const absDeltaY = Math.abs(deltaY);
        const VERTICAL_THRESHOLD = 0.02; // Порог для вертикального движения
        
        if (absDeltaY > VERTICAL_THRESHOLD) {
          const timeSinceLastVertical = now - lastVerticalMovementTimeRef.current;
          if (timeSinceLastVertical > VERTICAL_MOVEMENT_COOLDOWN) {
            lastVerticalMovementTimeRef.current = now;
            
            console.log('✅ Planet switch (VERTICAL MOVEMENT):', {
              deltaY,
              absDeltaY,
              from: currentPlanet,
            });
            
            if (deltaY > 0) {
              // Движение вверх → следующая планета
              currentPlanet = getNextPlanet(currentPlanet);
              newState.currentPlanet = currentPlanet;
              console.log('↑ Next planet:', currentPlanet);
            } else {
              // Движение вниз → предыдущая планета
              currentPlanet = getPreviousPlanet(currentPlanet);
              newState.currentPlanet = currentPlanet;
              console.log('↓ Previous planet:', currentPlanet);
            }
            planetSwitched = true;
          }
        }
      }
      
      // ЖЕСТ 3: Вращение кисти (roll) - резкое изменение roll
      if (!planetSwitched && previousOrientationRef.current) {
        const deltaRoll = Math.abs(handData.orientation.roll - previousOrientationRef.current.roll);
        const ROLL_THRESHOLD = 30; // Порог для резкого вращения (градусы)
        
        if (deltaRoll > ROLL_THRESHOLD) {
          const timeSinceLastSwipe = now - lastSwipeTimeRef.current;
          if (timeSinceLastSwipe > SWIPE_COOLDOWN) {
            lastSwipeTimeRef.current = now;
            
            console.log('✅ Planet switch (HAND ROTATION):', {
              deltaRoll,
              currentRoll: handData.orientation.roll,
              from: currentPlanet,
            });
            
            // Положительное вращение → следующая планета, отрицательное → предыдущая
            if (handData.orientation.roll > previousOrientationRef.current.roll) {
              currentPlanet = getNextPlanet(currentPlanet);
              newState.currentPlanet = currentPlanet;
              console.log('↻ Next planet:', currentPlanet);
            } else {
              currentPlanet = getPreviousPlanet(currentPlanet);
              newState.currentPlanet = currentPlanet;
              console.log('↺ Previous planet:', currentPlanet);
            }
            planetSwitched = true;
          }
        }
      }
      
      // ЖЕСТ 4: Обычный свайп (резервный вариант)
      if (!planetSwitched && hasSwipe && hasVelocity) {
        const timeSinceLastSwipe = now - lastSwipeTimeRef.current;
        const isNewSwipe = output.swipe.direction !== lastSwipeDirectionRef.current;
        
        if (timeSinceLastSwipe > SWIPE_COOLDOWN || isNewSwipe) {
          lastSwipeTimeRef.current = now;
          lastSwipeDirectionRef.current = output.swipe.direction;
          
          console.log('✅ Planet switch (SWIPE):', {
            direction: output.swipe.direction,
            velocity: output.swipe.velocity,
            from: currentPlanet,
          });
          
          if (output.swipe.direction === 'right') {
            currentPlanet = getNextPlanet(currentPlanet);
            newState.currentPlanet = currentPlanet;
            console.log('→ Next planet:', currentPlanet);
          } else if (output.swipe.direction === 'left') {
            currentPlanet = getPreviousPlanet(currentPlanet);
            newState.currentPlanet = currentPlanet;
            console.log('← Previous planet:', currentPlanet);
          }
          planetSwitched = true;
        }
      }
      
      if (!hasSwipe) {
        lastSwipeDirectionRef.current = 'none';
      }
      
      // Обновляем currentPlanet в newState
      newState.currentPlanet = currentPlanet;

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

