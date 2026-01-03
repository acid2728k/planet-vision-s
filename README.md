# Planet Vision S v0.1

<div align="center">

![Planet Vision S](https://img.shields.io/badge/Planet_Vision_S-v0.1-00ff00?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

**Interactive 3D planet visualization controlled by hand gestures**

[🚀 Quick Start](#-quick-start) • [📋 Features](#-features) • [🛠 Technologies](#-technologies)

</div>

---

Planet Vision S is an interactive web application that combines real-time hand gesture recognition with 3D planet visualization. Control planets from the solar system using natural hand gestures - zoom, rotate, and navigate through space with intuitive movements.

## 🚀 Quick Start

### Requirements

- Node.js 18+ (check: `node --version`)
- npm or yarn
- Web camera
- Modern browser (Chrome, Firefox, Safari)

### Installation and Setup

1. **Navigate to the project directory:**

   ```bash
   cd vision-os-gesture-app-new/frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start the dev server:**

   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - The application will be available at: `http://localhost:5173`
   - On first launch, the browser will request camera permission - allow access
   - Switch to "PLANET MODE" to interact with 3D planets

## 📋 Features

### Analysis Mode
- **Real-time gesture recognition** via MediaPipe Hands
- **Hand skeleton visualization** with overlay on video
- **Finger extension analysis** (5 indicators)
- **Orientation compass** for palm
- **Pinch strength graph** with history
- **Neural activity map** (15x15 pixel grid)
- **Gesture detection**: OPEN, CLOSED, PINCH, THUMBS_UP, THUMBS_DOWN, POINT, VICTORY

### Planet Mode (NEW!)
- **Interactive 3D planet visualization** using particle systems
- **8 planets of the solar system**: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune
- **Gesture-based control**:
  - **Zoom in/out**: Pinch gesture (thumb + index finger)
  - **Rotate with finger**: Move your index finger to rotate the planet
  - **Rotate with hand**: Circular hand movements rotate the planet
  - **Switch planets**: Swipe left/right to navigate between planets
- **Realistic planet rendering** with particle systems
- **Planet rings** for Saturn, Uranus, and Neptune

## 🎨 Interface

The interface features a dark theme with purple accents, mimicking a futuristic terminal style:

- Black background (#000000)
- Purple accents (#bb00ff, #aa66cc)
- Monospace font (JetBrains Mono)
- Glow and pulse effects

## 🛠 Technologies

- **React 19** + **TypeScript**
- **Vite** - build tool and dev server
- **@mediapipe/hands** - gesture recognition
- **@mediapipe/camera_utils** - camera handling
- **React Three Fiber** - 3D rendering framework
- **Three.js** - 3D graphics library
- **@react-three/drei** - useful helpers for R3F
- **Canvas API** - hand skeleton rendering

## 📁 Project Structure

```
vision-os-gesture-app-new/
└── frontend/
    ├── src/
    │   ├── components/      # React UI components
    │   │   └── PlanetViewer/ # 3D planet visualization
    │   ├── hooks/           # Custom hooks
    │   │   └── usePlanetControl.ts # Planet gesture control
    │   ├── services/        # Business logic
    │   │   └── gestureController.ts # Gesture processing
    │   ├── data/            # Data files
    │   │   └── planets.ts   # Planet definitions
    │   ├── utils/           # Utilities
    │   ├── types/           # TypeScript types
    │   └── styles/          # Styles
    ├── package.json
    └── vite.config.ts
```

## 🔧 Commands

- `npm run dev` - start dev server
- `npm run build` - build for production
- `npm run preview` - preview production build

## 🎮 How to Use Planet Mode

1. **Switch to Planet Mode** using the mode switcher at the top
2. **Position your hand** in front of the camera
3. **Control the planet**:
   - **Pinch** (thumb + index) to zoom in/out
   - **Move your index finger** to rotate the planet
   - **Rotate your hand** in circular motions to spin the planet
   - **Swipe left/right** to switch between planets

## ⚠️ Notes

- Web camera access is required
- MediaPipe loads models from CDN on first launch
- Chrome is recommended for best performance
- On Mac, you may need to allow camera access in system settings
- For best gesture recognition, ensure good lighting

## 🐛 Troubleshooting

**Camera not working:**

- Check browser permissions for camera access
- Make sure the camera is not being used by another application
- Try a different browser

**Slow performance:**

- Close other browser tabs
- Reduce camera resolution in code (in `mediapipeService.ts`)
- Reduce particle count in `planets.ts`

**Installation errors:**

- Make sure Node.js version is 18+
- Use `npm install --legacy-peer-deps` if you encounter peer dependency issues
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again

**Gestures not working:**

- Ensure good lighting conditions
- Keep your hand clearly visible in the camera frame
- Try adjusting gesture sensitivity in `gestureController.ts`

---

<div align="center">

**Made with ❤️ for the community**

⭐ If you liked the project, give it a star!

</div>
