import { useState, useEffect } from "react";
import {
  StatusBar,
  OpticalSensor,
  FingerExtension,
  OrientationCompass,
  PinchAnalysis,
  NeuralHeatmap,
  DetectedGesture,
  PlanetViewer,
} from "./components";
import { useMediaPipe } from "./hooks/useMediaPipe";
import { useHandTracking } from "./hooks/useHandTracking";
import { usePlanetControl } from "./hooks/usePlanetControl";
import styles from "./App.module.css";

type ViewMode = "analysis" | "planet";

function App() {
  const { videoRef, landmarks, handCount, fps, isInitialized, error, retry } =
    useMediaPipe();
  const [isRecording] = useState(true);
  const [pinchHistory, setPinchHistory] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("analysis"); // Временно только analysis mode

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
          {/* Переключатель режимов */}
          <div className={styles.modeSwitcher}>
            <button
              className={`${styles.modeButton} ${
                viewMode === "analysis" ? styles.modeButtonActive : ""
              }`}
              onClick={() => setViewMode("analysis")}
            >
              ANALYSIS MODE
            </button>
            <button
              className={`${styles.modeButton} ${
                viewMode === "planet" ? styles.modeButtonActive : ""
              }`}
              onClick={() => setViewMode("planet")}
            >
              PLANET MODE
            </button>
          </div>

          {viewMode === "analysis" ? (
            <div className={styles.main}>
              <div className={styles.leftColumn}>
                <OpticalSensor
                  videoRef={videoRef}
                  landmarks={landmarks}
                  fps={fps}
                  handCount={handCount}
                  isRecording={isRecording}
                />
                <PinchAnalysis
                  pinch={
                    handData?.pinch || {
                      strength: 0,
                      distance: 0,
                      history: [],
                    }
                  }
                />
              </div>
              <div className={styles.rightColumn}>
                <div className={styles.rightGrid}>
                  <FingerExtension
                    extension={
                      handData?.fingerExtension || {
                        thumb: 0,
                        index: 0,
                        middle: 0,
                        ring: 0,
                        pinky: 0,
                      }
                    }
                  />
                  <OrientationCompass
                    orientation={
                      handData?.orientation || {
                        heading: 0,
                        pitch: 0,
                        roll: 0,
                      }
                    }
                  />
                  <NeuralHeatmap heatmap={heatmapData} handCount={handCount} />
                  <DetectedGesture gesture={handData?.gesture || "NONE"} />
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.planetMode}>
              <div className={styles.planetViewerContainer}>
                <PlanetViewer controlState={controlState} />
              </div>
              <div className={styles.planetControls}>
                <OpticalSensor
                  videoRef={videoRef}
                  landmarks={landmarks}
                  fps={fps}
                  handCount={handCount}
                  isRecording={isRecording}
                />
                <DetectedGesture gesture={handData?.gesture || "NONE"} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
