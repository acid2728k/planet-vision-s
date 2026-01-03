import { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { ParticlePlanet } from './ParticlePlanet';
import { PlanetData, PlanetControlState } from '../../types';
import { PLANETS } from '../../data/planets';
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
  const canvasRef = useRef<HTMLDivElement>(null);
  const [planetNameSize, setPlanetNameSize] = useState(24); // Размер текста в пикселях

  // Обновляем текущую планету при изменении
  useEffect(() => {
    const newPlanet = PLANETS[controlState.currentPlanet];
    if (newPlanet.type !== previousPlanetRef.current.type) {
      setCurrentPlanetData(newPlanet);
      previousPlanetRef.current = newPlanet;
      onPlanetChange?.(newPlanet);
    }
  }, [controlState.currentPlanet, onPlanetChange]);

  // Вычисляем размер текста как 2% от размера планеты
  useEffect(() => {
    const updateTextSize = () => {
      if (canvasRef.current) {
        const canvasHeight = canvasRef.current.clientHeight;
        // Размер планеты примерно 60% от высоты canvas (визуально)
        const planetSize = canvasHeight * 0.6;
        // 2% от размера планеты
        const textSize = planetSize * 0.02;
        setPlanetNameSize(Math.max(16, Math.min(48, textSize))); // Ограничиваем от 16 до 48px
      }
    };

    updateTextSize();
    window.addEventListener('resize', updateTextSize);
    return () => window.removeEventListener('resize', updateTextSize);
  }, []);

  return (
    <div className={styles.planetViewer}>
      <div className={styles.canvasContainer} ref={canvasRef}>
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
        </Canvas>
      </div>
      <div className={styles.planetLabel}>
        <span className={styles.navArrow}>←</span>
        <span 
          className={styles.planetName}
          style={{ fontSize: `${planetNameSize}px` }}
        >
          {currentPlanetData.name}
        </span>
        <span className={styles.navArrow}>→</span>
      </div>
    </div>
  );
}
