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
 * Создает точки света (города) на поверхности планеты
 */
function createCityLights(radius: number, count: number = 2000): Float32Array {
  const positions: number[] = [];
  
  for (let i = 0; i < count; i++) {
    // Генерируем случайную точку на сфере (континенты более вероятны)
    const theta = Math.random() * Math.PI;
    const phi = Math.random() * 2 * Math.PI;
    
    // Создаем кластеры (города)
    const clusterSize = Math.random() < 0.3 ? 3 + Math.random() * 5 : 1;
    
    for (let j = 0; j < clusterSize; j++) {
      const offsetTheta = (Math.random() - 0.5) * 0.1;
      const offsetPhi = (Math.random() - 0.5) * 0.1;
      
      const x = radius * Math.cos(phi + offsetPhi) * Math.sin(theta + offsetTheta);
      const y = radius * Math.cos(theta + offsetTheta);
      const z = radius * Math.sin(phi + offsetPhi) * Math.sin(theta + offsetTheta);
      
      positions.push(x, y, z);
    }
  }
  
  return new Float32Array(positions);
}

/**
 * Создает соединительные линии между городами (сеть)
 */
function createConnectionNetwork(radius: number, cityCount: number = 500): Float32Array {
  const positions: number[] = [];
  const cities: { x: number; y: number; z: number }[] = [];
  
  // Генерируем города
  for (let i = 0; i < cityCount; i++) {
    const theta = Math.random() * Math.PI;
    const phi = Math.random() * 2 * Math.PI;
    
    const x = radius * Math.cos(phi) * Math.sin(theta);
    const y = radius * Math.cos(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    cities.push({ x, y, z });
  }
  
  // Создаем соединения между ближайшими городами
  for (let i = 0; i < cities.length; i++) {
    const city1 = cities[i];
    let nearestDistance = Infinity;
    let nearestCity = null;
    
    // Находим ближайший город
    for (let j = 0; j < cities.length; j++) {
      if (i === j) continue;
      const city2 = cities[j];
      const dx = city2.x - city1.x;
      const dy = city2.y - city1.y;
      const dz = city2.z - city1.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance < nearestDistance && distance < radius * 0.8) {
        nearestDistance = distance;
        nearestCity = city2;
      }
    }
    
    // Создаем линию к ближайшему городу
    if (nearestCity) {
      positions.push(city1.x, city1.y, city1.z, nearestCity.x, nearestCity.y, nearestCity.z);
    }
  }
  
  // Создаем несколько межконтинентальных линий
  for (let i = 0; i < Math.min(100, cities.length / 5); i++) {
    const city1 = cities[Math.floor(Math.random() * cities.length)];
    const city2 = cities[Math.floor(Math.random() * cities.length)];
    
    const dx = city2.x - city1.x;
    const dy = city2.y - city1.y;
    const dz = city2.z - city1.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Создаем длинные линии (межконтинентальные)
    if (distance > radius * 1.2) {
      positions.push(city1.x, city1.y, city1.z, city2.x, city2.y, city2.z);
    }
  }
  
  return new Float32Array(positions);
}

/**
 * Создает яркое кольцо света по краю планеты
 */
function createEdgeRing(radius: number, segments: number = 128): Float32Array {
  const positions: number[] = [];
  const ringRadius = radius * 1.01; // Чуть больше радиуса планеты
  
  for (let i = 0; i < segments; i++) {
    const angle1 = (i * 2 * Math.PI) / segments;
    const angle2 = ((i + 1) * 2 * Math.PI) / segments;
    
    // Создаем точки на экваторе
    const x1 = ringRadius * Math.cos(angle1);
    const y1 = 0;
    const z1 = ringRadius * Math.sin(angle1);
    
    const x2 = ringRadius * Math.cos(angle2);
    const y2 = 0;
    const z2 = ringRadius * Math.sin(angle2);
    
    positions.push(x1, y1, z1, x2, y2, z2);
  }
  
  // Добавляем вертикальные линии для эффекта свечения
  for (let i = 0; i < segments / 4; i++) {
    const angle = (i * 2 * Math.PI) / (segments / 4);
    const x = ringRadius * Math.cos(angle);
    const z = ringRadius * Math.sin(angle);
    
    positions.push(x, -ringRadius * 0.3, z, x, ringRadius * 0.3, z);
  }
  
  return new Float32Array(positions);
}

/**
 * Создает контуры континентов (для Земли)
 */
function createContinentOutlines(radius: number): Float32Array {
  const positions: number[] = [];
  const continentCount = 6; // Примерное количество континентов
  
  for (let c = 0; c < continentCount; c++) {
    const centerTheta = Math.random() * Math.PI;
    const centerPhi = Math.random() * 2 * Math.PI;
    const continentSize = 0.3 + Math.random() * 0.4;
    const points = 20 + Math.floor(Math.random() * 30);
    
    for (let i = 0; i < points; i++) {
      const angle = (i * 2 * Math.PI) / points;
      const offsetTheta = centerTheta + Math.cos(angle) * continentSize * (0.3 + Math.random() * 0.2);
      const offsetPhi = centerPhi + Math.sin(angle) * continentSize * (0.3 + Math.random() * 0.2);
      
      const x = radius * Math.cos(offsetPhi) * Math.sin(offsetTheta);
      const y = radius * Math.cos(offsetTheta);
      const z = radius * Math.sin(offsetPhi) * Math.sin(offsetTheta);
      
      const nextAngle = ((i + 1) * 2 * Math.PI) / points;
      const nextOffsetTheta = centerTheta + Math.cos(nextAngle) * continentSize * (0.3 + Math.random() * 0.2);
      const nextOffsetPhi = centerPhi + Math.sin(nextAngle) * continentSize * (0.3 + Math.random() * 0.2);
      
      const x2 = radius * Math.cos(nextOffsetPhi) * Math.sin(nextOffsetTheta);
      const y2 = radius * Math.cos(nextOffsetTheta);
      const z2 = radius * Math.sin(nextOffsetPhi) * Math.sin(nextOffsetTheta);
      
      positions.push(x, y, z, x2, y2, z2);
    }
  }
  
  return new Float32Array(positions);
}

/**
 * Создает геометрию для колец планеты
 */
function createRingGeometry(
  innerRadius: number,
  outerRadius: number,
  segments: number = 64
): THREE.BufferGeometry {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments);
  return geometry;
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

  // Цвета для визуализации "Земля ночью"
  const cityLightColor = useMemo(() => {
    return new THREE.Color('#FFD700'); // Золотистый
  }, []);

  const networkLineColor = useMemo(() => {
    return new THREE.Color('#87CEEB'); // Светло-голубой
  }, []);

  const edgeRingColor = useMemo(() => {
    return new THREE.Color('#FFD700'); // Золотистый
  }, []);

  const continentColor = useMemo(() => {
    return new THREE.Color('#FFFFFF'); // Белый для контуров
  }, []);

  const ringColor = useMemo(() => {
    if (!planet.ringColor) return new THREE.Color('#E0E0E0');
    return new THREE.Color(planet.ringColor);
  }, [planet.ringColor]);

  // Создаем точки света (города)
  const cityLights = useMemo(() => {
    const count = Math.floor(planet.particleCount / 2);
    return createCityLights(planet.radius, count);
  }, [planet.radius, planet.particleCount]);

  // Создаем сеть соединений
  const networkLines = useMemo(() => {
    const cityCount = Math.floor(planet.particleCount / 4);
    return createConnectionNetwork(planet.radius, cityCount);
  }, [planet.radius, planet.particleCount]);

  // Создаем кольцо света по краю
  const edgeRing = useMemo(() => {
    return createEdgeRing(planet.radius, 128);
  }, [planet.radius]);

  // Создаем контуры континентов
  const continentOutlines = useMemo(() => {
    return createContinentOutlines(planet.radius);
  }, [planet.radius]);

  // Материалы
  const cityLightMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: cityLightColor,
      size: 0.03,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.0,
    });
  }, [cityLightColor]);

  const networkLineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: networkLineColor,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
    });
  }, [networkLineColor]);

  const edgeRingMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: edgeRingColor,
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });
  }, [edgeRingColor]);

  const continentMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: continentColor,
      transparent: true,
      opacity: 0.8,
      linewidth: 1,
    });
  }, [continentColor]);

  // Геометрии
  const cityLightGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(cityLights, 3));
    return geometry;
  }, [cityLights]);

  const networkLineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(networkLines, 3));
    return geometry;
  }, [networkLines]);

  const edgeRingGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(edgeRing, 3));
    return geometry;
  }, [edgeRing]);

  const continentGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(continentOutlines, 3));
    return geometry;
  }, [continentOutlines]);

  // Геометрия для колец
  const ringGeometry = useMemo(() => {
    if (!planet.hasRings) return null;
    const innerRadius = planet.radius * 1.2;
    const outerRadius = planet.radius * 1.8;
    return createRingGeometry(innerRadius, outerRadius, 64);
  }, [planet.hasRings, planet.radius]);

  const ringMaterial = useMemo(() => {
    if (!ringGeometry) return null;
    return new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
    });
  }, [ringGeometry, ringColor]);

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

  return (
    <group>
      {/* Основная планета */}
      <group ref={planetGroupRef}>
        {/* Контуры континентов */}
        <lineSegments geometry={continentGeometry} material={continentMaterial} />
        
        {/* Точки света (города) */}
        <points geometry={cityLightGeometry} material={cityLightMaterial} />
        
        {/* Сеть соединений между городами */}
        <lineSegments geometry={networkLineGeometry} material={networkLineMaterial} />
        
        {/* Яркое кольцо света по краю */}
        <lineSegments geometry={edgeRingGeometry} material={edgeRingMaterial} />
      </group>

      {/* Кольца (если есть) */}
      {ringGeometry && ringMaterial && (
        <group ref={ringGroupRef}>
          <mesh geometry={ringGeometry} material={ringMaterial} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      )}
    </group>
  );
}
