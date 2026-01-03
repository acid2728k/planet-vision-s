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
 * Создает wireframe геометрию с сеткой линий
 */
function createWireframeGeometry(radius: number, segments: number = 32): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(radius, segments, segments);
  const wireframe = new THREE.WireframeGeometry(geometry);
  return wireframe;
}

/**
 * Создает сетку точек на поверхности сферы
 */
function createPointGrid(radius: number, density: number = 50): Float32Array {
  const positions: number[] = [];
  const segments = Math.floor(density);
  
  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    
    for (let lon = 0; lon <= segments; lon++) {
      const phi = (lon * 2 * Math.PI) / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      const x = radius * cosPhi * sinTheta;
      const y = radius * cosTheta;
      const z = radius * sinPhi * sinTheta;
      
      positions.push(x, y, z);
    }
  }
  
  return new Float32Array(positions);
}

/**
 * Создает сетку соединительных линий между точками
 */
function createConnectionLines(radius: number, density: number = 50): Float32Array {
  const positions: number[] = [];
  const segments = Math.floor(density);
  
  // Горизонтальные линии (параллели)
  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    
    for (let lon = 0; lon < segments; lon++) {
      const phi1 = (lon * 2 * Math.PI) / segments;
      const phi2 = ((lon + 1) * 2 * Math.PI) / segments;
      
      const x1 = radius * Math.cos(phi1) * sinTheta;
      const y1 = radius * cosTheta;
      const z1 = radius * Math.sin(phi1) * sinTheta;
      
      const x2 = radius * Math.cos(phi2) * sinTheta;
      const y2 = radius * cosTheta;
      const z2 = radius * Math.sin(phi2) * sinTheta;
      
      positions.push(x1, y1, z1, x2, y2, z2);
    }
  }
  
  // Вертикальные линии (меридианы)
  for (let lon = 0; lon <= segments; lon++) {
    const phi = (lon * 2 * Math.PI) / segments;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    
    for (let lat = 0; lat < segments; lat++) {
      const theta1 = (lat * Math.PI) / segments;
      const theta2 = ((lat + 1) * Math.PI) / segments;
      
      const sinTheta1 = Math.sin(theta1);
      const cosTheta1 = Math.cos(theta1);
      const sinTheta2 = Math.sin(theta2);
      const cosTheta2 = Math.cos(theta2);
      
      const x1 = radius * cosPhi * sinTheta1;
      const y1 = radius * cosTheta1;
      const z1 = radius * sinPhi * sinTheta1;
      
      const x2 = radius * cosPhi * sinTheta2;
      const y2 = radius * cosTheta2;
      const z2 = radius * sinPhi * sinTheta2;
      
      positions.push(x1, y1, z1, x2, y2, z2);
    }
  }
  
  return new Float32Array(positions);
}

/**
 * Создает дополнительные детализированные линии для эффекта сетки
 */
function createDetailLines(radius: number, count: number = 2000): Float32Array {
  const positions: number[] = [];
  
  for (let i = 0; i < count; i++) {
    // Случайная точка на сфере
    const theta = Math.random() * Math.PI;
    const phi = Math.random() * 2 * Math.PI;
    
    const x1 = radius * Math.cos(phi) * Math.sin(theta);
    const y1 = radius * Math.cos(theta);
    const z1 = radius * Math.sin(phi) * Math.sin(theta);
    
    // Случайная соседняя точка (небольшое смещение)
    const deltaTheta = (Math.random() - 0.5) * 0.1;
    const deltaPhi = (Math.random() - 0.5) * 0.1;
    
    const theta2 = theta + deltaTheta;
    const phi2 = phi + deltaPhi;
    
    const x2 = radius * Math.cos(phi2) * Math.sin(theta2);
    const y2 = radius * Math.cos(theta2);
    const z2 = radius * Math.sin(phi2) * Math.sin(theta2);
    
    positions.push(x1, y1, z1, x2, y2, z2);
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

  // Преобразуем цвет из hex в THREE.Color
  const planetColor = useMemo(() => {
    return new THREE.Color(planet.color);
  }, [planet.color]);

  const ringColor = useMemo(() => {
    if (!planet.ringColor) return planetColor;
    return new THREE.Color(planet.ringColor);
  }, [planet.ringColor, planetColor]);

  // Создаем wireframe геометрию
  const wireframeGeometry = useMemo(() => {
    return createWireframeGeometry(planet.radius, 32);
  }, [planet.radius]);

  // Создаем сетку точек
  const pointPositions = useMemo(() => {
    const density = Math.floor(Math.sqrt(planet.particleCount / 10));
    return createPointGrid(planet.radius, density);
  }, [planet.radius, planet.particleCount]);

  // Создаем соединительные линии
  const linePositions = useMemo(() => {
    const density = Math.floor(Math.sqrt(planet.particleCount / 10));
    return createConnectionLines(planet.radius, density);
  }, [planet.radius, planet.particleCount]);

  // Создаем детализированные линии
  const detailLines = useMemo(() => {
    return createDetailLines(planet.radius, Math.floor(planet.particleCount / 4));
  }, [planet.radius, planet.particleCount]);

  // Материалы
  const wireframeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: planetColor,
      transparent: true,
      opacity: 0.8,
      linewidth: 1,
    });
  }, [planetColor]);

  const pointMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: planetColor,
      size: 0.015,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });
  }, [planetColor]);

  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: planetColor,
      transparent: true,
      opacity: 0.6,
      linewidth: 1,
    });
  }, [planetColor]);

  const detailLineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: planetColor,
      transparent: true,
      opacity: 0.4,
      linewidth: 1,
    });
  }, [planetColor]);

  // Геометрии для линий
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    return geometry;
  }, [linePositions]);

  const detailLineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(detailLines, 3));
    return geometry;
  }, [detailLines]);

  const pointGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
    return geometry;
  }, [pointPositions]);

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
      opacity: 0.3,
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
        {/* Wireframe сфера */}
        <lineSegments geometry={wireframeGeometry} material={wireframeMaterial} />
        
        {/* Сетка соединительных линий */}
        <lineSegments geometry={lineGeometry} material={lineMaterial} />
        
        {/* Детализированные линии */}
        <lineSegments geometry={detailLineGeometry} material={detailLineMaterial} />
        
        {/* Точки на поверхности */}
        <points geometry={pointGeometry} material={pointMaterial} />
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
