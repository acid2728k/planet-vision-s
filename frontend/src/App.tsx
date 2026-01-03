import { useState, useEffect } from "react";
import {
  StatusBar,
  PlanetViewer,
} from "./components";
import { useMediaPipe } from "./hooks/useMediaPipe";
import { useHandTracking } from "./hooks/useHandTracking";
import { usePlanetControl } from "./hooks/usePlanetControl";
import styles from "./App.module.css";

// Planet Vision S - только Planet Mode

function App() {
  const { videoRef, landmarks, handCount, fps, isInitialized, error, retry } =
    useMediaPipe();
  const [isRecording] = useState(true);
  const [pinchHistory, setPinchHistory] = useState<number[]>([]);
  // Planet Vision S - только Planet Mode, Analysis Mode удален // Временно только analysis mode

  const { handData, heatmapData } = useHandTracking(landmarks, pinchHistory);
  
  // Управление планетой через жесты
  const { controlState } = usePlanetControl({
    handData,
    landmarks,
  });

  useEffect(() => {
    if (handData?.pinch.history) {
      setPinchHistory(handData.pinch.history);
    }
  }, [handData]);

  // Debug: проверка загрузки
  useEffect(() => {
    console.log("App mounted, isInitialized:", isInitialized, "error:", error);
  }, [isInitialized, error]);

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.error}>
          <h2>Ошибка инициализации</h2>
          <p>{error}</p>
          <p>
            Убедитесь, что у вас есть доступ к камере и разрешили его
            использование.
          </p>
          <button onClick={retry} className={styles.retryButton}>
            Запросить доступ к камере
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <StatusBar />
      {!isInitialized && !error && (
        <div className={styles.loadingContainer}>
          <div className={styles.loading}>
            <div className={styles.loadingText}>Инициализация Planet Vision S...</div>
            <div className={styles.loadingBar}>
              <div className={styles.loadingBarFill}></div>
            </div>
          </div>
        </div>
      )}
      {/* Видео элемент всегда рендерится для MediaPipe, но скрыт */}
      <video
        ref={videoRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
        autoPlay
        playsInline
        muted
      />
      {isInitialized && (
        <>
          {/* Planet Vision S - только Planet Mode */}
          <div className={styles.planetMode}>
            <PlanetViewer controlState={controlState} />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
