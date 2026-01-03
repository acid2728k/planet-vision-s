import { NormalizedLandmarkList } from "@mediapipe/hands";

export interface HandLandmarks {
  landmarks: NormalizedLandmarkList;
  handedness: "Left" | "Right";
}

export interface FingerExtension {
  thumb: number; // 0-1
  index: number; // 0-1
  middle: number; // 0-1
  ring: number; // 0-1
  pinky: number; // 0-1
}

export interface HandOrientation {
  heading: number; // 0-360 degrees
  pitch: number; // -90 to 90 degrees
  roll: number; // -180 to 180 degrees
}

export interface PinchData {
  strength: number; // 0-1
  distance: number; // pixels
  history: number[]; // last N values for graph
}

export type GestureType =
  | "OPEN"
  | "CLOSED"
  | "PINCH"
  | "THUMBS_UP"
  | "THUMBS_DOWN"
  | "POINT"
  | "VICTORY"
  | "NONE";

export interface HandData {
  landmarks: NormalizedLandmarkList;
  fingerExtension: FingerExtension;
  orientation: HandOrientation;
  pinch: PinchData;
  gesture: GestureType;
  confidence: number;
}

export interface NeuralHeatmapData {
  pixels: number[]; // Flat array of pixel values 0-1, width x height
  width: number;
  height: number;
  activePixels: number;
}

// Planet types
export type PlanetType =
  | "SATURN"
  | "HYPERION"
  | "EPIMETHEUS"
  | "TELESTO"
  | "PHOEBE";

export type MoonShape = "sphere" | "irregular" | "ellipsoid";

export interface PlanetData {
  name: string;
  type: PlanetType;
  color: string;
  particleCount: number;
  radius: number;
  hasRings: boolean;
  ringColor?: string;
  shape?: MoonShape; // Форма спутника (для не-сферических)
  shapeParams?: {
    // Параметры для неправильных форм
    irregularity?: number; // 0-1, степень неправильности
    elongation?: number; // 0-1, вытянутость
  };
}

export interface PlanetControlState {
  zoom: number; // 0.5 - 2.0
  rotationX: number; // degrees
  rotationY: number; // degrees
  rotationZ: number; // degrees
  currentPlanet: PlanetType;
}

export interface SwipeDirection {
  direction: "left" | "right" | "none";
  velocity: number;
}
