import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlanetData } from '../../types';

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

  // Генерируем геометрию частиц для планеты с рандомными размерами
  const planetData = useMemo(() => {
    return generateSphereParticles(planet.particleCount, planet.radius);
  }, [planet.particleCount, planet.radius]);

  // Генерируем геометрию частиц для колец (если есть)
  const ringData = useMemo(() => {
    if (!planet.hasRings) return null;
    const innerRadius = planet.radius * 1.2;
    const outerRadius = planet.radius * 1.8;
    return generateRingParticles(planet.particleCount * 0.3, innerRadius, outerRadius);
  }, [planet.hasRings, planet.particleCount, planet.radius]);

  // Преобразуем цвет из hex в THREE.Color
  const planetColor = useMemo(() => {
    return new THREE.Color(planet.color);
  }, [planet.color]);

  const ringColor = useMemo(() => {
    if (!planet.ringColor) return planetColor;
    return new THREE.Color(planet.ringColor);
  }, [planet.ringColor, planetColor]);

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
  const planetGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(planetData.positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(planetData.sizes, 1));
    return geometry;
  }, [planetData]);

  const ringGeometry = useMemo(() => {
    if (!ringData) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(ringData.positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(ringData.sizes, 1));
    return geometry;
  }, [ringData]);

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
  const planetPoints = useMemo(() => {
    return new THREE.Points(planetGeometry, planetMaterial);
  }, [planetGeometry, planetMaterial]);

  const ringPoints = useMemo(() => {
    if (!ringGeometry || !ringMaterial) return null;
    return new THREE.Points(ringGeometry, ringMaterial);
  }, [ringGeometry, ringMaterial]);

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
