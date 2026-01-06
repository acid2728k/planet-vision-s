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
  const firstPinchFingerRef = useRef<'index' | null>(null);
  const previousPinchFingerRef = useRef<'index' | null>(null);
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

      // ===== ЖЕСТЫ ДЛЯ ПЕРЕКЛЮЧЕНИЯ ПЛАНЕТ =====
      const now = Date.now();
      let planetSwitched = false;
      
      // ЖЕСТ: Двойное зажатие указательного и большого пальцев для переключения планет
      // Два раза зажать указательный + большой = следующая планета
      // ВАЖНО: Остальные пальцы (средний, безымянный, мизинец) должны быть РАЗЖАТЫ
      
      // Определяем, зажат ли указательный палец с большим
      const mainHandLandmarks = landmarks[0];
      const thumbTip = landmarkToPoint(mainHandLandmarks[LANDMARKS.THUMB_TIP]);
      const indexTip = landmarkToPoint(mainHandLandmarks[LANDMARKS.INDEX_TIP]);
      
      // Вычисляем расстояние от большого пальца до указательного
      const thumbIndexDistance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2) + 
        Math.pow(thumbTip.z - indexTip.z, 2)
      );
      
      // Определяем, зажат ли указательный палец с большим
      const PINCH_DISTANCE_THRESHOLD = 0.05; // Порог для определения зажатия
      const isIndexPinched = thumbIndexDistance < PINCH_DISTANCE_THRESHOLD;
      
      // КРИТИЧЕСКИ ВАЖНО: Проверяем, что остальные пальцы РАЗЖАТЫ
      // Если средний, безымянный или мизинец тоже согнуты - это кулак, а не правильное зажатие
      const OTHER_FINGERS_EXTENDED_THRESHOLD = 0.4; // Порог для разжатых пальцев
      const areOtherFingersExtended = 
        handData.fingerExtension.middle > OTHER_FINGERS_EXTENDED_THRESHOLD &&
        handData.fingerExtension.ring > OTHER_FINGERS_EXTENDED_THRESHOLD &&
        handData.fingerExtension.pinky > OTHER_FINGERS_EXTENDED_THRESHOLD;
      
      // Проверка на кулак: ВСЕ пальцы согнуты (включая указательный)
      const isFist = 
        handData.fingerExtension.index < 0.3 &&
        handData.fingerExtension.middle < 0.3 &&
        handData.fingerExtension.ring < 0.3 &&
        handData.fingerExtension.pinky < 0.3;
      
      // Определяем текущее зажатие: ТОЛЬКО указательный + большой
      // И ТОЛЬКО если остальные пальцы разжаты (это не кулак)
      let currentPinchFinger: 'index' | null = null;
      
      if (isIndexPinched && !isFist && areOtherFingersExtended) {
        // Указательный зажат с большим И это не кулак И остальные пальцы разжаты
        currentPinchFinger = 'index';
      } else {
        // Не зажат, или это кулак, или остальные пальцы не разжаты
        currentPinchFinger = null;
      }
      
      // ЕСЛИ КУЛАК - полностью блокируем переключение планет
      if (isFist) {
        // Кулак обнаружен - сбрасываем счетчик двойного зажатия
        if (firstPinchTimeRef.current !== 0) {
          firstPinchTimeRef.current = 0;
          firstPinchFingerRef.current = null;
          console.log('🚫 Кулак обнаружен - блокируем переключение планет (должен делать зум ин):', {
            indexExtension: handData.fingerExtension.index.toFixed(3),
            middleExtension: handData.fingerExtension.middle.toFixed(3),
            ringExtension: handData.fingerExtension.ring.toFixed(3),
            pinkyExtension: handData.fingerExtension.pinky.toFixed(3),
            isIndexPinched,
            areOtherFingersExtended,
          });
        }
        // Выходим из логики переключения планет - кулак обрабатывается только для зума
        // Сохраняем текущий зажатый палец как null для следующего кадра
        previousPinchFingerRef.current = null;
        // Пропускаем всю логику переключения планет
      } else {
        // Это НЕ кулак - продолжаем логику переключения планет
      
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
            isIndexPinched,
            areOtherFingersExtended,
            indexExtension: handData.fingerExtension.index.toFixed(3),
            middleExtension: handData.fingerExtension.middle.toFixed(3),
            ringExtension: handData.fingerExtension.ring.toFixed(3),
            pinkyExtension: handData.fingerExtension.pinky.toFixed(3),
          });
        }
        
        // Логика двойного зажатия
        // ВАЖНО: Работает ТОЛЬКО если:
        // 1. Это НЕ кулак (!isFist)
        // 2. Указательный и большой зажаты (isIndexPinched)
        // 3. Остальные пальцы разжаты (areOtherFingersExtended)
        // 4. Это указательный палец (currentPinchFinger === 'index')
        if (pinchJustStarted && !planetSwitched && currentPinchFinger === 'index') {
          const timeSinceFirstPinch = now - firstPinchTimeRef.current;
          
          // Проверяем, это первое или второе зажатие
          if (firstPinchTimeRef.current === 0 || timeSinceFirstPinch > DOUBLE_PINCH_TIMEOUT) {
            // Первое зажатие - запоминаем время и палец
            firstPinchTimeRef.current = now;
            firstPinchFingerRef.current = 'index';
            console.log('👆 Первое зажатие указательного:', {
              time: now,
              areOtherFingersExtended,
            });
          } else {
            // Второе зажатие - проверяем, тот же палец и в пределах таймаута
            if (firstPinchFingerRef.current === 'index' && timeSinceFirstPinch <= DOUBLE_PINCH_TIMEOUT) {
              // Двойное зажатие обнаружено!
              console.log('✅ Двойное зажатие указательного обнаружено:', {
                timeSinceFirstPinch,
                from: currentPlanet,
                areOtherFingersExtended,
              });
              
              // Два раза указательный + большой = следующая планета
              currentPlanet = getNextPlanet(currentPlanet);
              console.log('👆 Двойное зажатие указательного → Next planet:', currentPlanet);
              
              // Сбрасываем счетчик для следующего двойного зажатия
              firstPinchTimeRef.current = 0;
              firstPinchFingerRef.current = null;
              planetSwitched = true;
            } else {
              // Другое зажатие или таймаут - начинаем заново
              firstPinchTimeRef.current = now;
              firstPinchFingerRef.current = 'index';
              console.log('🔄 Новое первое зажатие (предыдущее сброшено):', {
                reason: firstPinchFingerRef.current !== 'index' ? 'другой палец' : 'таймаут',
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
      }
      
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

