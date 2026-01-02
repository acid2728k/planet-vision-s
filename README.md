# VISION_OS v0.9.1 - Neural Interface Terminal

<div align="center">

![VISION_OS](https://img.shields.io/badge/VISION_OS-v0.9.1-00ff00?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

**Real-time hand gesture recognition web application using MediaPipe Hands**

[🚀 Quick Start](#-quick-start) • [📋 Features](#-features) • [🛠 Technologies](#-technologies)

</div>

---

Real-time hand gesture recognition web application using MediaPipe Hands, styled as a VISION_OS terminal interface.

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
   npm install
   ```

3. **Start the dev server:**

   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - The application will be available at: `http://localhost:5173`
   - On first launch, the browser will request camera permission - allow access

## 📋 Features

- **Real-time gesture recognition** via MediaPipe Hands
- **Hand skeleton visualization** with overlay on video
- **Finger extension analysis** (5 indicators)
- **Orientation compass** for palm
- **Pinch strength graph** with history
- **Neural activity map** (15x15 pixel grid)
- **Gesture detection**: OPEN, CLOSED, PINCH, THUMBS_UP, THUMBS_DOWN, POINT, VICTORY

## 🎨 Interface

The interface features a dark theme with purple accents, mimicking the VISION_OS terminal style:

- Black background (#000000)
- Purple accents (#bb00ff, #aa66cc)
- Monospace font (JetBrains Mono)
- Glow and pulse effects

## 🛠 Technologies

- **React 19** + **TypeScript**
- **Vite** - build tool and dev server
- **@mediapipe/hands** - gesture recognition
- **@mediapipe/camera_utils** - camera handling
- **Canvas API** - hand skeleton rendering

## 📁 Project Structure

```
vision-os-gesture-app-new/
└── frontend/
    ├── src/
    │   ├── components/      # React UI components
    │   ├── hooks/          # Custom hooks
    │   ├── services/       # Business logic
    │   ├── utils/          # Utilities
    │   ├── types/          # TypeScript types
    │   └── styles/         # Styles
    ├── package.json
    └── vite.config.ts
```

## 🔧 Commands

- `npm run dev` - start dev server
- `npm run build` - build for production
- `npm run preview` - preview production build

## ⚠️ Notes

- Web camera access is required
- MediaPipe loads models from CDN on first launch
- Chrome is recommended for best performance
- On Mac, you may need to allow camera access in system settings

## 🐛 Troubleshooting

**Camera not working:**

- Check browser permissions for camera access
- Make sure the camera is not being used by another application
- Try a different browser

**Slow performance:**

- Close other browser tabs
- Reduce camera resolution in code (in `mediapipeService.ts`)

**Installation errors:**

- Make sure Node.js version is 18+
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again

---

<div align="center">

**Made with ❤️ for the community**

⭐ If you liked the project, give it a star!

</div>
