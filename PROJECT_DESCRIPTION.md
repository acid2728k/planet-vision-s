# Planet Vision S v0.1

## Description

Planet Vision S is an interactive web application that combines real-time hand gesture recognition with 3D planet visualization. Control planets from the solar system using natural hand gestures - zoom, rotate, and navigate through space with intuitive movements.

The application provides two modes:
1. **Analysis Mode**: Detailed hand movement analysis with gesture recognition
2. **Planet Mode**: Interactive 3D planet visualization controlled by gestures

## MVP: What's Implemented

### Analysis Mode
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

### Planet Mode (NEW in v0.1)
11. **Interactive 3D planet visualization** using particle systems
12. **8 planets of the solar system**: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune
13. **Gesture-based planet control**:
    - Zoom in/out via pinch gesture
    - Rotate with index finger movement
    - Rotate with circular hand movements
    - Switch planets with swipe gestures
14. **Realistic planet rendering** with particle systems
15. **Planet rings** for Saturn, Uranus, and Neptune

## How to Access

**GitHub repository:** [To be added]

### Quick Start:

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

The application will be available at: `http://localhost:5173`

---

**Technologies:** React 19, TypeScript, MediaPipe Hands, React Three Fiber, Three.js, Vite, Canvas API
