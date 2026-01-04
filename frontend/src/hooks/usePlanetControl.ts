import { useState, useEffect, useRef } from 'react';
import { NormalizedLandmarkList } from '@mediapipe/hands';
import { HandData, PlanetControlState, PlanetType } from '../types';
import { processGestureControl, GestureControlInput } from '../services/gestureController';
import { getNextPlanet, getPreviousPlanet } from '../data/planets';
import { landmarkToPoint } from '../utils/mathUtils';

const LANDMARKS = {
  INDEX_TIP: 8,
  MIDDLE_TIP: 12,
  THUMB_TIP: 4,
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
  const lastPlanetRef = useRef<PlanetType>(controlState.currentPlanet); // Отслеживаем последнюю установленную планету
  
  // Для отслеживания двойного зажатия
  const firstPinchTimeRef = useRef<number>(0);
  const firstPinchFingerRef = useRef<'index' | 'middle' | null>(null);
  const previousPinchFingerRef = useRef<'index' | 'middle' | null>(null);
  const DOUBLE_PINCH_TIMEOUT = 600; // Максимальное время между двумя зажатиями (мс)
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
      
      // ВАЖНО: Используем lastPlanetRef для отслеживания последней установленной планеты
      // Это решает проблему батчинга React, когда prev.currentPlanet может быть устаревшим
      // Если prev.currentPlanet отличается от lastPlanetRef, используем lastPlanetRef (более актуальное значение)
      let currentPlanet = prev.currentPlanet;
      if (prev.currentPlanet !== lastPlanetRef.current) {
        // Если есть расхождение, используем значение из ref (более актуальное)
        currentPlanet = lastPlanetRef.current;
        console.log('⚠️ Planet mismatch detected, using ref value:', {
          prevPlanet: prev.currentPlanet,
          refPlanet: lastPlanetRef.current,
          using: currentPlanet,
        });
      }
      
      const newState: PlanetControlState = {
        zoom: output.zoom,
        rotationX: newRotationX,
        rotationY: newRotationY,
        rotationZ: newRotationZ,
        currentPlanet: currentPlanet, // Используем актуальное значение
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
      
      // ЖЕСТ: Двойное зажатие для переключения планет
      // Два раза зажать указательный и большой = вперед
      // Два раза зажать средний и большой = назад
      // ВАЖНО: НЕ реагируем на кулак (зажатие всех пальцев)
      
      // ПРОВЕРКА: Определяем, это кулак или одиночное зажатие
      // Кулак = ВСЕ пальцы согнуты сильно (fingerExtension < 0.25 для всех)
      const isFist = 
        handData.fingerExtension.index < 0.25 &&
        handData.fingerExtension.middle < 0.25 &&
        handData.fingerExtension.ring < 0.25 &&
        handData.fingerExtension.pinky < 0.25;
      
      // Определяем, какой палец зажат с большим
      const mainHandLandmarks = landmarks[0];
      const thumbTip = landmarkToPoint(mainHandLandmarks[LANDMARKS.THUMB_TIP]);
      const indexTip = landmarkToPoint(mainHandLandmarks[LANDMARKS.INDEX_TIP]);
      const middleTip = landmarkToPoint(mainHandLandmarks[LANDMARKS.MIDDLE_TIP]);
      
      // Вычисляем расстояния от большого пальца до указательного и среднего
      const thumbIndexDistance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2) + 
        Math.pow(thumbTip.z - indexTip.z, 2)
      );
      const thumbMiddleDistance = Math.sqrt(
        Math.pow(thumbTip.x - middleTip.x, 2) + 
        Math.pow(thumbTip.y - middleTip.y, 2) + 
        Math.pow(thumbTip.z - middleTip.z, 2)
      );
      
      // Определяем, какой палец ближе к большому (зажат)
      const PINCH_DISTANCE_THRESHOLD = 0.05; // Порог для определения зажатия
      const isIndexPinched = thumbIndexDistance < PINCH_DISTANCE_THRESHOLD;
      const isMiddlePinched = thumbMiddleDistance < PINCH_DISTANCE_THRESHOLD;
      
      // Определяем текущий зажатый палец
      // ВАЖНО: Игнорируем ТОЛЬКО если это кулак (все пальцы сильно согнуты)
      let currentPinchFinger: 'index' | 'middle' | null = null;
      
      if (!isFist) {
        // Это НЕ кулак - определяем зажатие
        if (isIndexPinched && !isMiddlePinched) {
          // Только указательный зажат с большим
          currentPinchFinger = 'index';
        } else if (isMiddlePinched && !isIndexPinched) {
          // Только средний зажат с большим
          currentPinchFinger = 'middle';
        } else if (isIndexPinched && isMiddlePinched) {
          // Оба зажаты одновременно - это может быть кулак, игнорируем для переключения
          // Но если это не кулак (ring/pinky не согнуты), выбираем ближайший
          if (handData.fingerExtension.ring > 0.3 || handData.fingerExtension.pinky > 0.3) {
            // Другие пальцы не согнуты - это не кулак, выбираем ближайший
            currentPinchFinger = thumbIndexDistance < thumbMiddleDistance ? 'index' : 'middle';
          } else {
            // Это кулак - игнорируем
            currentPinchFinger = null;
          }
        }
      } else {
        // Это кулак - игнорируем для переключения планет
        // Кулак должен делать зум ин (это обрабатывается в gestureController)
        currentPinchFinger = null;
        if (isIndexPinched || isMiddlePinched) {
          console.log('🚫 Кулак обнаружен - игнорируем pinch для переключения планет (должен делать зум ин):', {
            isFist,
            indexExtension: handData.fingerExtension.index.toFixed(3),
            middleExtension: handData.fingerExtension.middle.toFixed(3),
            ringExtension: handData.fingerExtension.ring.toFixed(3),
            pinkyExtension: handData.fingerExtension.pinky.toFixed(3),
          });
        }
      }
      
      const previousPinchFinger = previousPinchFingerRef.current;
      const isPinching = currentPinchFinger !== null;
      const wasPinching = previousPinchFinger !== null;
      
      // Определяем момент начала pinch (переход от не-зажато к зажато)
      const pinchJustStarted = isPinching && !wasPinching;
      
      // ДИАГНОСТИКА: Логируем состояние для отладки
      if (pinchJustStarted || (isPinching && currentPinchFinger !== previousPinchFinger)) {
        console.log('🔍 PINCH диагностика:', {
          currentPinchFinger,
          previousPinchFinger,
          isPinching,
          wasPinching,
          pinchJustStarted,
          isFist,
          thumbIndexDistance: thumbIndexDistance.toFixed(3),
          thumbMiddleDistance: thumbMiddleDistance.toFixed(3),
          indexExtension: handData.fingerExtension.index.toFixed(3),
          middleExtension: handData.fingerExtension.middle.toFixed(3),
          ringExtension: handData.fingerExtension.ring.toFixed(3),
          pinkyExtension: handData.fingerExtension.pinky.toFixed(3),
        });
      }
      
      // Логика двойного зажатия
      if (pinchJustStarted && !planetSwitched) {
        const timeSinceFirstPinch = now - firstPinchTimeRef.current;
        
        // Проверяем, это первое или второе зажатие
        if (firstPinchTimeRef.current === 0 || timeSinceFirstPinch > DOUBLE_PINCH_TIMEOUT) {
          // Первое зажатие - запоминаем время и палец
          firstPinchTimeRef.current = now;
          firstPinchFingerRef.current = currentPinchFinger;
          console.log('👆 Первое зажатие:', {
            finger: currentPinchFinger,
            time: now,
          });
        } else {
          // Второе зажатие - проверяем, тот же палец и в пределах таймаута
          if (firstPinchFingerRef.current === currentPinchFinger && timeSinceFirstPinch <= DOUBLE_PINCH_TIMEOUT) {
            // Двойное зажатие обнаружено!
            console.log('✅ Двойное зажатие обнаружено:', {
              finger: currentPinchFinger,
              timeSinceFirstPinch,
              from: currentPlanet,
            });
            
            // Переключаем планету в зависимости от пальца
            if (currentPinchFinger === 'index') {
              // Два раза указательный + большой = вперед
              currentPlanet = getNextPlanet(currentPlanet);
              console.log('👆 Двойное зажатие указательного → Next planet:', currentPlanet);
            } else if (currentPinchFinger === 'middle') {
              // Два раза средний + большой = назад
              currentPlanet = getPreviousPlanet(currentPlanet);
              console.log('👈 Двойное зажатие среднего ← Previous planet:', currentPlanet);
            }
            
            // Сбрасываем счетчик для следующего двойного зажатия
            firstPinchTimeRef.current = 0;
            firstPinchFingerRef.current = null;
            planetSwitched = true;
          } else {
            // Другое зажатие или таймаут - начинаем заново
            firstPinchTimeRef.current = now;
            firstPinchFingerRef.current = currentPinchFinger;
            console.log('🔄 Новое первое зажатие (предыдущее сброшено):', {
              finger: currentPinchFinger,
              reason: firstPinchFingerRef.current !== currentPinchFinger ? 'другой палец' : 'таймаут',
            });
          }
        }
      } else if (!isPinching && wasPinching) {
        // Палец отпущен - если прошло много времени, сбрасываем счетчик
        const timeSinceFirstPinch = now - firstPinchTimeRef.current;
        if (timeSinceFirstPinch > DOUBLE_PINCH_TIMEOUT) {
          firstPinchTimeRef.current = 0;
          firstPinchFingerRef.current = null;
          console.log('🔓 Палец отпущен, счетчик сброшен');
        }
      }
      
      // Сохраняем текущий зажатый палец для следующего кадра
      previousPinchFingerRef.current = currentPinchFinger;
      
      // ЖЕСТ 1: Pinch (схлопывание большого и указательного пальцев) + движение влево/вправо
      // ОТКЛЮЧЕН: Используем только ЖЕСТ 0 (простой pinch)
      // Раскомментируйте, если нужен этот жест
      /*
      const hasSwipe = output.swipe.direction !== 'none';
      const hasVelocity = output.swipe.velocity > 0.005;
      
      if (isPinching && hasSwipe && hasVelocity && !planetSwitched) {
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
            console.log('→ Next planet:', currentPlanet);
          } else if (output.swipe.direction === 'left') {
            currentPlanet = getPreviousPlanet(currentPlanet);
            console.log('← Previous planet:', currentPlanet);
          }
          planetSwitched = true;
        }
      }
      */
      
      // ЖЕСТ 2: Движение руки вверх/вниз (вертикальное движение)
      // ОТКЛЮЧЕН: Используем только ЖЕСТ 0 (простой pinch)
      // Раскомментируйте, если нужен этот жест
      /*
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
              console.log('↑ Next planet:', currentPlanet, 'from', prev.currentPlanet);
            } else {
              // Движение вниз → предыдущая планета
              currentPlanet = getPreviousPlanet(currentPlanet);
              console.log('↓ Previous planet:', currentPlanet, 'from', prev.currentPlanet);
            }
            planetSwitched = true;
          }
        }
      }
      */
      
      // ЖЕСТ 3: Вращение кисти (roll) - резкое изменение roll
      // ОТКЛЮЧЕН: Используем только ЖЕСТ 0 (простой pinch)
      // Раскомментируйте, если нужен этот жест
      /*
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
              console.log('↻ Next planet:', currentPlanet, 'from', prev.currentPlanet);
            } else {
              currentPlanet = getPreviousPlanet(currentPlanet);
              console.log('↺ Previous planet:', currentPlanet, 'from', prev.currentPlanet);
            }
            planetSwitched = true;
          }
        }
      }
      */
      
      // ЖЕСТ 4: Обычный свайп (резервный вариант)
      // ОТКЛЮЧЕН: Используем только ЖЕСТ 0 (простой pinch)
      // Раскомментируйте, если нужен этот жест
      /*
      const hasSwipe = output.swipe.direction !== 'none';
      const hasVelocity = output.swipe.velocity > 0.005;
      
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
            console.log('→ Next planet:', currentPlanet);
          } else if (output.swipe.direction === 'left') {
            currentPlanet = getPreviousPlanet(currentPlanet);
            console.log('← Previous planet:', currentPlanet);
          }
          planetSwitched = true;
        }
      }
      */
      
      // Сбрасываем направление свайпа (для будущего использования)
      const hasSwipe = output.swipe.direction !== 'none';
      if (!hasSwipe) {
        lastSwipeDirectionRef.current = 'none';
      }
      
      // ВАЖНО: ВСЕГДА используем currentPlanet (который может быть изменен жестами)
      // Если планета была переключена, currentPlanet содержит новое значение
      // Если нет - currentPlanet = prev.currentPlanet (не изменился)
      newState.currentPlanet = currentPlanet;
      
      // Обновляем ref с новым значением планеты
      if (planetSwitched) {
        lastPlanetRef.current = currentPlanet;
        console.log('🔄 Planet was switched:', {
          from: prev.currentPlanet,
          to: currentPlanet,
          newStatePlanet: newState.currentPlanet,
          refUpdated: lastPlanetRef.current,
        });
      } else {
        // Даже если планета не переключена, обновляем ref для синхронизации
        lastPlanetRef.current = currentPlanet;
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
        prevPlanet: prev.currentPlanet,
        planetSwitched,
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

