import { useEffect, useState } from 'react';
import styles from './StatusBar.module.css';

export const StatusBar = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cpuMem, setCpuMem] = useState(14);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const cpuInterval = setInterval(() => {
      // Simulate CPU/MEM usage (14% ± 2%)
      setCpuMem(14 + Math.floor(Math.random() * 5) - 2);
    }, 2000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(cpuInterval);
    };
  }, []);

  const formatTime = (date: Date): string => {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds} UTC+00`;
  };

  return (
    <header className={styles.statusBar}>
      <div className={styles.left}>
        <div className={styles.title}>Planet Vision S v0.1</div>
        <div className={styles.subtitle}>INTERACTIVE 3D PLANET CONTROL // GESTURE RECOGNITION</div>
      </div>
      <div className={styles.right}>
        <div className={styles.liveIndicator}>
          <span className={styles.liveDot}></span>
          LIVE
        </div>
        <div className={styles.cpuMem}>CPU_MEM: {cpuMem}%</div>
        <div className={styles.time}>{formatTime(currentTime)}</div>
      </div>
    </header>
  );
};

