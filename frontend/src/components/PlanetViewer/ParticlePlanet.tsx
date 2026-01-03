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
): Float32Array {
  const positions = new Float32Array(count * 3);
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
  }

  return positions;
}

/**
 * Генерирует позиции частиц для колец планеты
 */
function generateRingParticles(
  count: number,
  innerRadius: number,
  outerRadius: number
): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = (Math.random() - 0.5) * 0.1; // Небольшая толщина кольца

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
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

  // Генерируем геометрию частиц для планеты
  const planetPositions = useMemo(() => {
    return generateSphereParticles(planet.particleCount, planet.radius);
  }, [planet.particleCount, planet.radius]);

  // Генерируем геометрию частиц для колец (если есть)
  const ringPositions = useMemo(() => {
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

  // Создаем материал для частиц
  const planetMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: planetColor,
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });
  }, [planetColor]);

  const ringMaterial = useMemo(() => {
    if (!ringPositions) return null;
    return new THREE.PointsMaterial({
      color: ringColor,
      size: 0.015,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });
  }, [ringColor, ringPositions]);

  // Создаем геометрию для частиц
  const planetGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(planetPositions, 3));
    return geometry;
  }, [planetPositions]);

  const ringGeometry = useMemo(() => {
    if (!ringPositions) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(ringPositions, 3));
    return geometry;
  }, [ringPositions]);

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
