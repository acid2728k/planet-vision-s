import { useRef, Suspense, ReactNode, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetData } from '../../types';

interface MoonModelProps {
  planet: PlanetData;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  zoom: number;
}

// Пути к моделям спутников
const MOON_MODELS: Record<string, string> = {
  HYPERION: '/models/moons/hyperion.glb',
  EPIMETHEUS: '/models/moons/epimetheus.glb',
  TELESTO: '/models/moons/telesto.glb',
  PHOEBE: '/models/moons/phoebe.glb',
};

/**
 * Компонент для отображения 3D модели спутника
 */
function MoonMesh({ planet, rotationX, rotationY, rotationZ, zoom }: MoonModelProps) {
  const modelPath = MOON_MODELS[planet.type];
  
  console.log('🌙 MoonMesh: Loading model for', planet.type, 'from path:', modelPath);
  
  let scene;
  try {
    const gltf = useGLTF(modelPath);
    scene = gltf.scene;
    console.log('✅ MoonMesh: Model loaded successfully for', planet.type);
  } catch (error) {
    console.error('❌ MoonMesh: Failed to load model for', planet.type, ':', error);
    throw error; // Пробрасываем ошибку, чтобы Suspense мог обработать
  }
  
  const groupRef = useRef<THREE.Group>(null);

  // Клонируем сцену, чтобы избежать проблем с переиспользованием
  const clonedScene = scene.clone();

  // Настраиваем материал для всех мешей в модели
  clonedScene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Создаем простой материал с цветом планеты
      const color = new THREE.Color(planet.color);
      child.material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.3,
        roughness: 0.7,
        emissive: color,
        emissiveIntensity: 0.1,
      });
    }
  });

  // Вычисляем масштаб на основе радиуса планеты
  // Модели могут быть разных размеров, поэтому нормализуем их
  const box = new THREE.Box3().setFromObject(clonedScene);
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = (planet.radius * 2) / maxDimension;

  // Применяем вращение и масштабирование
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = rotationX * 0.0174533;
      groupRef.current.rotation.y = rotationY * 0.0174533;
      groupRef.current.rotation.z = rotationZ * 0.0174533;
      groupRef.current.scale.set(zoom * scale, zoom * scale, zoom * scale);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * Fallback компонент - простая геометрия, если модель не загружена
 */
function MoonFallback({ planet, rotationX, rotationY, rotationZ, zoom }: MoonModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = new THREE.Color(planet.color);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x = rotationX * 0.0174533;
      meshRef.current.rotation.y = rotationY * 0.0174533;
      meshRef.current.rotation.z = rotationZ * 0.0174533;
      meshRef.current.scale.set(zoom, zoom, zoom);
    }
  });

  // Создаем простую неправильную форму в зависимости от типа спутника
  let geometry: THREE.BufferGeometry;
  if (planet.type === 'HYPERION') {
    // Гиперион - неправильная форма (используем Octahedron с деформацией)
    geometry = new THREE.OctahedronGeometry(planet.radius, 0);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      // Добавляем случайные деформации
      positions.setX(i, x * (1 + (Math.random() - 0.5) * 0.3));
      positions.setY(i, y * (1 + (Math.random() - 0.5) * 0.3));
      positions.setZ(i, z * (1 + (Math.random() - 0.5) * 0.3));
    }
    positions.needsUpdate = true;
  } else if (planet.type === 'EPIMETHEUS') {
    // Эпиметей - яйцевидная форма
    geometry = new THREE.SphereGeometry(planet.radius, 16, 16);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      // Вытягиваем по одной оси
      positions.setX(i, x * 1.4);
      positions.setY(i, y * 0.8);
      positions.setZ(i, z * 1.2);
    }
    positions.needsUpdate = true;
  } else {
    // Телесто и Феба - сферические
    geometry = new THREE.SphereGeometry(planet.radius, 16, 16);
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.7}
        emissive={color}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

/**
 * Проверяет доступность модели через fetch
 */
async function checkModelExists(path: string): Promise<boolean> {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Основной компонент для отображения спутника
 * Использует 3D модель, если доступна, иначе fallback
 */
export function MoonModel(props: MoonModelProps) {
  const modelPath = MOON_MODELS[props.planet.type];

  console.log('🪐 MoonModel: Rendering', props.planet.type, 'modelPath:', modelPath);

  if (!modelPath) {
    console.warn('⚠️ MoonModel: No model path for', props.planet.type, '- using fallback');
    return <MoonFallback {...props} />;
  }

  // Проверяем доступность модели
  const [modelExists, setModelExists] = useState<boolean | null>(null);
  
  useEffect(() => {
    checkModelExists(modelPath).then((exists) => {
      setModelExists(exists);
      if (!exists) {
        console.warn('⚠️ MoonModel: Model file not found:', modelPath, '- using fallback');
      } else {
        console.log('✅ MoonModel: Model file found:', modelPath);
      }
    });
  }, [modelPath]);

  // Если модель не найдена, используем fallback
  if (modelExists === false) {
    return <MoonFallback {...props} />;
  }

  return (
    <Suspense fallback={<MoonFallback {...props} />}>
      <MoonMesh {...props} />
    </Suspense>
  );
}

/**
 * Простой Error Boundary для обработки ошибок загрузки моделей
 */
function ErrorBoundary({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('❌ ErrorBoundary: Model loading error:', error);
    return <>{fallback}</>;
  }
}

// Предзагрузка моделей для лучшей производительности
// useGLTF.preload - статический метод из @react-three/drei
export function preloadMoonModels() {
  Object.values(MOON_MODELS).forEach((path) => {
    try {
      // @ts-ignore - useGLTF.preload может быть не в типах, но существует в runtime
      if (useGLTF && useGLTF.preload) {
        useGLTF.preload(path);
      }
    } catch (error) {
      console.warn(`Failed to preload model: ${path}`, error);
    }
  });
}

