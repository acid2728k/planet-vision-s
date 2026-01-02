# VISION_OS Gesture Recognition

## Description

Real-time hand gesture recognition web application using MediaPipe Hands and machine learning. The application provides detailed hand movement analysis, including tracking of each finger, palm orientation, pinch strength, and activity visualization in the form of a neural map. The interface is designed in VISION_OS terminal style with a dark theme and purple accents, creating a futuristic interaction experience.

## MVP: What's Implemented

1. **Real-time hand gesture recognition** via web camera using MediaPipe Hands
2. **Hand skeleton visualization** with bone and joint overlay on video in real-time
3. **Analysis of extension for each of 5 fingers** with separate graphs for thumb, index, middle, ring, and pinky
4. **Palm orientation compass** displaying heading, pitch, and roll angles
5. **Pinch strength graph** with signal history and real-time visualization
6. **Neural activity map** - 15x15 pixel grid that responds to hand movement in different areas
7. **Gesture detection** - automatic recognition: OPEN, CLOSED, PINCH, THUMBS_UP, THUMBS_DOWN, POINT, VICTORY
8. **Dual hand support** - tracking and visualization of both hands in frame
9. **Adaptive interface** with terminal design in VISION_OS style, dark theme with purple accents
10. **Status bar** with FPS information, hand count, and recording status

## How to Access

**GitHub repository:** [https://github.com/acid2728k/vision-os-gesture-app](https://github.com/acid2728k/vision-os-gesture-app)

### Quick Start:

```bash
cd frontend
npm install
npm run dev
```

The application will be available at: `http://localhost:5173`

---

**Technologies:** React 19, TypeScript, MediaPipe Hands, Vite, Canvas API
