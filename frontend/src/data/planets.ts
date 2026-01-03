import { PlanetData, PlanetType } from '../types';

export const PLANETS: Record<PlanetType, PlanetData> = {
  MERCURY: {
    name: 'Mercury',
    type: 'MERCURY',
    color: '#E8E8E8', // Светло-серый
    particleCount: 8000,
    radius: 0.4,
    hasRings: false,
  },
  VENUS: {
    name: 'Venus',
    type: 'VENUS',
    color: '#F5F5F5', // Почти белый
    particleCount: 10000,
    radius: 0.6,
    hasRings: false,
  },
  EARTH: {
    name: 'Earth',
    type: 'EARTH',
    color: '#FFFFFF', // Белый
    particleCount: 12000,
    radius: 0.6,
    hasRings: false,
  },
  MARS: {
    name: 'Mars',
    type: 'MARS',
    color: '#D8D8D8', // Серый
    particleCount: 9000,
    radius: 0.5,
    hasRings: false,
  },
  JUPITER: {
    name: 'Jupiter',
    type: 'JUPITER',
    color: '#F0F0F0', // Светло-серый
    particleCount: 20000,
    radius: 1.2,
    hasRings: false,
  },
  SATURN: {
    name: 'Saturn',
    type: 'SATURN',
    color: '#FAFAFA', // Почти белый
    particleCount: 18000,
    radius: 1.0,
    hasRings: true,
    ringColor: '#E0E0E0', // Светло-серый для колец
  },
  URANUS: {
    name: 'Uranus',
    type: 'URANUS',
    color: '#F8F8F8', // Очень светло-серый
    particleCount: 15000,
    radius: 0.8,
    hasRings: true,
    ringColor: '#E8E8E8', // Светло-серый для колец
  },
  NEPTUNE: {
    name: 'Neptune',
    type: 'NEPTUNE',
    color: '#F2F2F2', // Светло-серый
    particleCount: 15000,
    radius: 0.8,
    hasRings: true,
    ringColor: '#D8D8D8', // Серый для колец
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

