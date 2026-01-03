import { PlanetData, PlanetType } from '../types';

export const PLANETS: Record<PlanetType, PlanetData> = {
  MERCURY: {
    name: 'Mercury',
    type: 'MERCURY',
    color: '#8C7853',
    particleCount: 8000,
    radius: 0.4,
    hasRings: false,
  },
  VENUS: {
    name: 'Venus',
    type: 'VENUS',
    color: '#FFC649',
    particleCount: 10000,
    radius: 0.6,
    hasRings: false,
  },
  EARTH: {
    name: 'Earth',
    type: 'EARTH',
    color: '#6B93D6',
    particleCount: 12000,
    radius: 0.6,
    hasRings: false,
  },
  MARS: {
    name: 'Mars',
    type: 'MARS',
    color: '#C1440E',
    particleCount: 9000,
    radius: 0.5,
    hasRings: false,
  },
  JUPITER: {
    name: 'Jupiter',
    type: 'JUPITER',
    color: '#D8CA9D',
    particleCount: 20000,
    radius: 1.2,
    hasRings: false,
  },
  SATURN: {
    name: 'Saturn',
    type: 'SATURN',
    color: '#FAD5A5',
    particleCount: 18000,
    radius: 1.0,
    hasRings: true,
    ringColor: '#C9B037',
  },
  URANUS: {
    name: 'Uranus',
    type: 'URANUS',
    color: '#4FD0E7',
    particleCount: 15000,
    radius: 0.8,
    hasRings: true,
    ringColor: '#4FD0E7',
  },
  NEPTUNE: {
    name: 'Neptune',
    type: 'NEPTUNE',
    color: '#4B70DD',
    particleCount: 15000,
    radius: 0.8,
    hasRings: true,
    ringColor: '#4B70DD',
  },
};

export const PLANET_ORDER: PlanetType[] = [
  'MERCURY',
  'VENUS',
  'EARTH',
  'MARS',
  'JUPITER',
  'SATURN',
  'URANUS',
  'NEPTUNE',
];

export function getNextPlanet(current: PlanetType): PlanetType {
  const currentIndex = PLANET_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % PLANET_ORDER.length;
  return PLANET_ORDER[nextIndex];
}

export function getPreviousPlanet(current: PlanetType): PlanetType {
  const currentIndex = PLANET_ORDER.indexOf(current);
  const prevIndex = (currentIndex - 1 + PLANET_ORDER.length) % PLANET_ORDER.length;
  return PLANET_ORDER[prevIndex];
}

