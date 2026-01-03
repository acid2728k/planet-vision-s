import { useMemo, useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetData } from '../../types';

interface MoonParticlesProps {
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
 * Генерирует частицы на поверхности 3D модели
 */
function generateParticlesFromModel(
  scene: THREE.Object3D,
  particleCount: number,
  targetRadius: number
): { positions: Float32Array; sizes: Float32Array } {
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // Собираем все меши из модели
  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      meshes.push(child);
    }
  });

  if (meshes.length === 0) {
    console.warn('No meshes found in model, using fallback');
    // Fallback: простая сфера
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = targetRadius;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.015 + Math.random() * 0.025;
    }
    return { positions, sizes };
  }

  // Вычисляем bounding box для нормализации размера
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = (targetRadius * 2) / maxDimension;

  // Собираем все вершины из всех мешей
  const allVertices: THREE.Vector3[] = [];
  
  meshes.forEach((mesh) => {
    const geometry = mesh.geometry;
    if (!geometry.attributes.position) return;

    const positionAttribute = geometry.attributes.position;
    
    // Применяем матрицу меша для получения мировых координат
    const matrix = mesh.matrixWorld.clone();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i)
      );
      
      // Преобразуем в мировые координаты
      vertex.applyMatrix4(matrix);
      
      // Масштабируем до нужного размера
      vertex.multiplyScalar(scale);
      
      allVertices.push(vertex);
    }
  });

  console.log(`📊 MoonParticles: Found ${allVertices.length} vertices from model`);

  // Если вершин недостаточно, используем интерполяцию
  if (allVertices.length === 0) {
    console.warn('No vertices found in model');
    // Fallback
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = targetRadius;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.015 + Math.random() * 0.025;
    }
    return { positions, sizes };
  }

  // Генерируем частицы, выбирая вершины из модели
  // Если вершин больше, чем нужно частиц, выбираем случайные
  // Если вершин меньше, повторяем выбор с вариацией
  for (let i = 0; i < particleCount; i++) {
    const vertexIndex = i % allVertices.length;
    const baseVertex = allVertices[vertexIndex].clone();
    
    // Добавляем небольшую вариацию для более естественного вида
    const variation = 0.01;
    baseVertex.x += (Math.random() - 0.5) * variation;
    baseVertex.y += (Math.random() - 0.5) * variation;
    baseVertex.z += (Math.random() - 0.5) * variation;

    positions[i * 3] = baseVertex.x;
    positions[i * 3 + 1] = baseVertex.y;
    positions[i * 3 + 2] = baseVertex.z;
    sizes[i] = 0.015 + Math.random() * 0.025;
  }

  // Если не удалось сгенерировать достаточно частиц, заполняем оставшиеся случайными точками
  if (generated < particleCount) {
    console.warn(`Only generated ${generated} particles, filling rest with random points`);
    for (let i = generated; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = targetRadius;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.015 + Math.random() * 0.025;
    }
  }

  return { positions, sizes };
}

/**
 * Компонент для отображения частиц на основе 3D модели
 */
function MoonParticlesMesh({ planet, rotationX, rotationY, rotationZ, zoom }: MoonParticlesProps) {
  const modelPath = MOON_MODELS[planet.type];
  
  console.log('🌙 MoonParticlesMesh: Loading model for', planet.type, 'from path:', modelPath);
  
  const { scene } = useGLTF(modelPath);
  const groupRef = useRef<THREE.Group>(null);

  // Генерируем частицы на поверхности модели
  const particleData = useMemo(() => {
    console.log('🔄 MoonParticlesMesh: Generating particles from model for', planet.type);
    const clonedScene = scene.clone();
    return generateParticlesFromModel(clonedScene, planet.particleCount, planet.radius);
  }, [scene, planet.particleCount, planet.radius, planet.type]);

  // Преобразуем цвет из hex в THREE.Color
  const planetColor = useMemo(() => {
    return new THREE.Color(planet.color);
  }, [planet.color]);

  // Создаем кастомный шейдер для круглых точек
  const planetShader = useMemo(() => {
    return {
      uniforms: {
        color: { value: planetColor },
      },
      vertexShader: `
        attribute float size;
        varying float vSize;
        
        void main() {
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vSize;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          // Создаем круг с мягкими краями
          float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
    };
  }, [planetColor]);

  // Создаем материал с кастомным шейдером
  const planetMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: planetShader.uniforms,
      vertexShader: planetShader.vertexShader,
      fragmentShader: planetShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [planetShader]);

  // Создаем геометрию для частиц
  const planetGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(particleData.positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(particleData.sizes, 1));
    return geometry;
  }, [particleData]);

  // Создаем объект Points для рендеринга
  const planetPoints = useMemo(() => {
    console.log('✨ MoonParticlesMesh: Creating Points object for', planet.type);
    return new THREE.Points(planetGeometry, planetMaterial);
  }, [planet.type, planetGeometry, planetMaterial]);

  // Применяем вращение и масштабирование
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = rotationX * 0.0174533;
      groupRef.current.rotation.y = rotationY * 0.0174533;
      groupRef.current.rotation.z = rotationZ * 0.0174533;
      groupRef.current.scale.set(zoom, zoom, zoom);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={planetPoints} />
    </group>
  );
}

/**
 * Fallback компонент - простая геометрия, если модель не загружена
 */
function MoonParticlesFallback({ planet, rotationX, rotationY, rotationZ, zoom }: MoonParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const color = new THREE.Color(planet.color);

  // Генерируем простые частицы на сфере
  const particleData = useMemo(() => {
    const positions = new Float32Array(planet.particleCount * 3);
    const sizes = new Float32Array(planet.particleCount);

    for (let i = 0; i < planet.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = planet.radius;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.015 + Math.random() * 0.025;
    }

    return { positions, sizes };
  }, [planet.particleCount, planet.radius]);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: color,
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });
  }, [color]);

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(particleData.positions, 3));
    return geom;
  }, [particleData]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x = rotationX * 0.0174533;
      meshRef.current.rotation.y = rotationY * 0.0174533;
      meshRef.current.rotation.z = rotationZ * 0.0174533;
      meshRef.current.scale.set(zoom, zoom, zoom);
    }
  });

  return <points ref={meshRef} geometry={geometry} material={material} />;
}

/**
 * Основной компонент для отображения спутника как частиц на основе 3D модели
 */
export function MoonParticles(props: MoonParticlesProps) {
  const modelPath = MOON_MODELS[props.planet.type];

  console.log('🪐 MoonParticles: Rendering', props.planet.type, 'modelPath:', modelPath);

  if (!modelPath) {
    console.warn('⚠️ MoonParticles: No model path for', props.planet.type, '- using fallback');
    return <MoonParticlesFallback {...props} />;
  }

  return (
    <Suspense fallback={<MoonParticlesFallback {...props} />}>
      <MoonParticlesMesh {...props} />
    </Suspense>
  );
}

