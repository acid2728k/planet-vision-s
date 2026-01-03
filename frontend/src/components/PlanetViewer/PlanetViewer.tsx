import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { ParticlePlanet } from './ParticlePlanet';
import { PlanetData, PlanetControlState } from '../../types';
import { PLANETS, PLANET_ORDER } from '../../data/planets';
import styles from './PlanetViewer.module.css';

interface PlanetViewerProps {
  controlState: PlanetControlState;
  onPlanetChange?: (planet: PlanetData) => void;
}

export function PlanetViewer({ controlState, onPlanetChange }: PlanetViewerProps) {
  const [currentPlanetData, setCurrentPlanetData] = useState<PlanetData>(
    PLANETS[controlState.currentPlanet]
  );
  const previousPlanetRef = useRef<PlanetData>(currentPlanetData);

  // Обновляем текущую планету при изменении
  useEffect(() => {
    const newPlanet = PLANETS[controlState.currentPlanet];
    if (newPlanet.type !== previousPlanetRef.current.type) {
      setCurrentPlanetData(newPlanet);
      previousPlanetRef.current = newPlanet;
      onPlanetChange?.(newPlanet);
    }
  }, [controlState.currentPlanet, onPlanetChange]);

  return (
    <div className={styles.planetViewer}>
      <div className={styles.header}>
        <span className={styles.label}>PLANET_VIEWER</span>
        <span className={styles.planetName}>{currentPlanetData.name}</span>
      </div>
      <div className={styles.canvasContainer}>
        <Canvas
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, 3], fov: 50 }}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <ParticlePlanet
            planet={currentPlanetData}
            rotationX={controlState.rotationX}
            rotationY={controlState.rotationY}
            rotationZ={controlState.rotationZ}
            zoom={controlState.zoom}
          />
          {/* Отключаем стандартные OrbitControls, так как управление через жесты */}
        </Canvas>
      </div>
      <div className={styles.footer}>
        <span>ZOOM: {controlState.zoom.toFixed(2)}x</span>
        <span>
          PLANET {PLANET_ORDER.indexOf(controlState.currentPlanet) + 1} /{' '}
          {PLANET_ORDER.length}
        </span>
      </div>
    </div>
  );
}

