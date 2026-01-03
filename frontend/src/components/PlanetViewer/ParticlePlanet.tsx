import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetData } from '../../types';
import { MoonModel } from './MoonModel';

interface ParticlePlanetProps {
  planet: PlanetData;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  zoom: number;
}

/**
 * Генерирует позиции частиц для сферической планеты
 */
function generateSphereParticles(
  count: number,
  radius: number
): { positions: Float32Array; sizes: Float32Array } {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const random = () => Math.random() - 0.5;

  for (let i = 0; i < count; i++) {
    // Генерируем случайную точку внутри сферы
    let x, y, z;
    do {
      x = random() * 2;
      y = random() * 2;
      z = random() * 2;
    } while (x * x + y * y + z * z > 1);

    // Нормализуем и масштабируем до радиуса
    const length = Math.sqrt(x * x + y * y + z * z);
    x = (x / length) * radius;
    y = (y / length) * radius;
    z = (z / length) * radius;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Рандомный размер для каждой точки (от 0.015 до 0.04)
    sizes[i] = 0.015 + Math.random() * 0.025;
  }

  return { positions, sizes };
}

/**
 * Генерирует позиции частиц для неправильной формы (картофелевидной)
 */
function generateIrregularParticles(
  count: number,
  radius: number,
  irregularity: number = 0.8,
  elongation: number = 0.6
): { positions: Float32Array; sizes: Float32Array } {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const random = () => Math.random() - 0.5;

  for (let i = 0; i < count; i++) {
    // Генерируем случайную точку внутри сферы
    let x, y, z;
    do {
      x = random() * 2;
      y = random() * 2;
      z = random() * 2;
    } while (x * x + y * y + z * z > 1);

    // Нормализуем
    const length = Math.sqrt(x * x + y * y + z * z);
    x = x / length;
    y = y / length;
    z = z / length;

    // Применяем неправильность - добавляем случайные вариации
    const irregularX = x + (Math.random() - 0.5) * irregularity * 0.3;
    const irregularY = y + (Math.random() - 0.5) * irregularity * 0.3;
    const irregularZ = z + (Math.random() - 0.5) * irregularity * 0.3;

    // Применяем вытянутость
    const elongatedX = irregularX * (1 + elongation * 0.3);
    const elongatedY = irregularY * (1 - elongation * 0.2);
    const elongatedZ = irregularZ * (1 + elongation * 0.1);

    // Нормализуем и масштабируем до радиуса
    const newLength = Math.sqrt(elongatedX * elongatedX + elongatedY * elongatedY + elongatedZ * elongatedZ);
    positions[i * 3] = (elongatedX / newLength) * radius;
    positions[i * 3 + 1] = (elongatedY / newLength) * radius;
    positions[i * 3 + 2] = (elongatedZ / newLength) * radius;

    // Рандомный размер для каждой точки
    sizes[i] = 0.015 + Math.random() * 0.025;
  }

  return { positions, sizes };
}

/**
 * Генерирует позиции частиц для эллипсоидной формы (яйцевидной)
 */
function generateEllipsoidParticles(
  count: number,
  radius: number,
  elongation: number = 0.7
): { positions: Float32Array; sizes: Float32Array } {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const random = () => Math.random() - 0.5;

  for (let i = 0; i < count; i++) {
    // Генерируем случайную точку внутри сферы
    let x, y, z;
    do {
      x = random() * 2;
      y = random() * 2;
      z = random() * 2;
    } while (x * x + y * y + z * z > 1);

    // Нормализуем
    const length = Math.sqrt(x * x + y * y + z * z);
    x = x / length;
    y = y / length;
    z = z / length;

    // Применяем эллипсоидную форму (яйцевидную)
    // Удлиняем по одной оси, сжимаем по другой
    const ellipsoidX = x * (1 + elongation * 0.4);
    const ellipsoidY = y * (1 - elongation * 0.2);
    const ellipsoidZ = z * (1 + elongation * 0.1);

    // Нормализуем и масштабируем до радиуса
    const newLength = Math.sqrt(ellipsoidX * ellipsoidX + ellipsoidY * ellipsoidY + ellipsoidZ * ellipsoidZ);
    positions[i * 3] = (ellipsoidX / newLength) * radius;
    positions[i * 3 + 1] = (ellipsoidY / newLength) * radius;
    positions[i * 3 + 2] = (ellipsoidZ / newLength) * radius;

    // Рандомный размер для каждой точки
    sizes[i] = 0.015 + Math.random() * 0.025;
  }

  return { positions, sizes };
}

/**
 * Генерирует позиции частиц для колец планеты
 */
function generateRingParticles(
  count: number,
  innerRadius: number,
  outerRadius: number
): { positions: Float32Array; sizes: Float32Array } {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = (Math.random() - 0.5) * 0.1; // Небольшая толщина кольца

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Рандомный размер для каждой точки (от 0.01 до 0.03)
    sizes[i] = 0.01 + Math.random() * 0.02;
  }

  return { positions, sizes };
}

/**
 * Создает кастомный шейдер для круглых точек
 */
function createCirclePointShader(color: THREE.Color) {
  return {
    uniforms: {
      color: { value: color },
      pointTexture: { value: null },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vSize;
      
      void main() {
        vColor = color;
        vSize = size;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying vec3 vColor;
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
}

export function ParticlePlanet({
  planet,
  rotationX,
  rotationY,
  rotationZ,
  zoom,
}: ParticlePlanetProps) {
  const planetGroupRef = useRef<THREE.Group>(null);
  const ringGroupRef = useRef<THREE.Group>(null);

  // Генерируем геометрию частиц для планеты/спутника с учетом формы
  // ВАЖНО: включаем planet.type в зависимости, чтобы геометрия пересоздавалась при смене планеты
  const planetData = useMemo(() => {
    console.log('🔄 ParticlePlanet: Regenerating geometry for planet:', planet.type, planet.name);
    const shape = planet.shape || 'sphere';
    const shapeParams = planet.shapeParams || {};

    switch (shape) {
      case 'irregular':
        return generateIrregularParticles(
          planet.particleCount,
          planet.radius,
          shapeParams.irregularity || 0.8,
          shapeParams.elongation || 0.6
        );
      case 'ellipsoid':
        return generateEllipsoidParticles(
          planet.particleCount,
          planet.radius,
          shapeParams.elongation || 0.7
        );
      case 'sphere':
      default:
        return generateSphereParticles(planet.particleCount, planet.radius);
    }
  }, [planet.type, planet.particleCount, planet.radius, planet.shape, planet.shapeParams]);

  // Генерируем геометрию частиц для колец (если есть)
  // ВАЖНО: включаем planet.type чтобы кольца обновлялись при смене планеты
  const ringData = useMemo(() => {
    if (!planet.hasRings) return null;
    const innerRadius = planet.radius * 1.2;
    const outerRadius = planet.radius * 1.8;
    return generateRingParticles(planet.particleCount * 0.3, innerRadius, outerRadius);
  }, [planet.type, planet.hasRings, planet.particleCount, planet.radius]);

  // Преобразуем цвет из hex в THREE.Color
  // ВАЖНО: включаем planet.type чтобы цвет обновлялся при смене планеты
  const planetColor = useMemo(() => {
    console.log('🎨 ParticlePlanet: Updating color for planet:', planet.type, planet.color);
    return new THREE.Color(planet.color);
  }, [planet.type, planet.color]);

  const ringColor = useMemo(() => {
    if (!planet.ringColor) return planetColor;
    return new THREE.Color(planet.ringColor);
  }, [planet.type, planet.ringColor, planetColor]);

  // Создаем кастомный шейдер для круглых точек
  const planetShader = useMemo(() => {
    return createCirclePointShader(planetColor);
  }, [planetColor]);

  const ringShader = useMemo(() => {
    if (!ringData) return null;
    return createCirclePointShader(ringColor);
  }, [ringColor, ringData]);

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

  const ringMaterial = useMemo(() => {
    if (!ringShader) return null;
    return new THREE.ShaderMaterial({
      uniforms: ringShader.uniforms,
      vertexShader: ringShader.vertexShader,
      fragmentShader: ringShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [ringShader]);

  // Создаем геометрию для частиц с атрибутом размера
  // ВАЖНО: включаем planet.type чтобы геометрия пересоздавалась при смене планеты
  const planetGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(planetData.positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(planetData.sizes, 1));
    return geometry;
  }, [planet.type, planetData]);

  const ringGeometry = useMemo(() => {
    if (!ringData) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(ringData.positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(ringData.sizes, 1));
    return geometry;
  }, [planet.type, ringData]);

  // Анимация вращения и масштабирования
  useFrame(() => {
    if (planetGroupRef.current) {
      planetGroupRef.current.rotation.x = rotationX * 0.0174533;
      planetGroupRef.current.rotation.y = rotationY * 0.0174533;
      planetGroupRef.current.rotation.z = rotationZ * 0.0174533;
      planetGroupRef.current.scale.set(zoom, zoom, zoom);
    }
    if (ringGroupRef.current) {
      ringGroupRef.current.rotation.x = rotationX * 0.0174533;
      ringGroupRef.current.rotation.y = rotationY * 0.0174533;
      ringGroupRef.current.rotation.z = rotationZ * 0.0174533;
      ringGroupRef.current.scale.set(zoom, zoom, zoom);
    }
  });

  // Создаем объекты Points для рендеринга
  // ВАЖНО: пересоздаем объекты при смене планеты
  const planetPoints = useMemo(() => {
    console.log('✨ ParticlePlanet: Creating new Points object for planet:', planet.type);
    return new THREE.Points(planetGeometry, planetMaterial);
  }, [planet.type, planetGeometry, planetMaterial]);

  const ringPoints = useMemo(() => {
    if (!ringGeometry || !ringMaterial) return null;
    console.log('✨ ParticlePlanet: Creating new ring Points object for planet:', planet.type);
    return new THREE.Points(ringGeometry, ringMaterial);
  }, [planet.type, ringGeometry, ringMaterial]);

  // Для спутников используем 3D модели, для Сатурна - частицы
  const isMoon = planet.type !== 'SATURN';

  if (isMoon) {
    // Используем 3D модель для спутников
    return (
      <MoonModel
        planet={planet}
        rotationX={rotationX}
        rotationY={rotationY}
        rotationZ={rotationZ}
        zoom={zoom}
      />
    );
  }

  // Для Сатурна используем частицы с кольцами
  return (
    <group>
      <group ref={planetGroupRef}>
        <primitive object={planetPoints} />
      </group>
      {ringPoints && (
        <group ref={ringGroupRef}>
          <primitive object={ringPoints} />
        </group>
      )}
    </group>
  );
}
