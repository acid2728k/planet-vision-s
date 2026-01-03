import { PlanetData, PlanetType } from '../types';

export const PLANETS: Record<PlanetType, PlanetData> = {
  SATURN: {
    name: 'Saturn',
    type: 'SATURN',
    color: '#FAFAFA', // Почти белый
    particleCount: 18000,
    radius: 1.0,
    hasRings: true,
    ringColor: '#E0E0E0', // Светло-серый для колец
    shape: 'sphere',
  },
  HYPERION: {
    name: 'Hyperion',
    type: 'HYPERION',
    color: '#E8E8E8', // Светло-серый
    particleCount: 10000,
    radius: 0.7, // Увеличено в 2 раза (было 0.35)
    hasRings: false,
    shape: 'model',
    modelPath: '/models/moons/hyperion.glb',
  },
  EPIMETHEUS: {
    name: 'Epimetheus',
    type: 'EPIMETHEUS',
    color: '#F0F0F0', // Светло-серый
    particleCount: 9000,
    radius: 0.6, // Увеличено в 2 раза (было 0.3)
    hasRings: false,
    shape: 'model',
    modelPath: '/models/moons/epimetheus.glb',
  },
  TELESTO: {
    name: 'Telesto',
    type: 'TELESTO',
    color: '#F5F5F5', // Почти белый
    particleCount: 8000,
    radius: 0.5, // Увеличено в 2 раза (было 0.25)
    hasRings: false,
    shape: 'model',
    modelPath: '/models/moons/telesto.glb',
  },
  PHOEBE: {
    name: 'Phoebe',
    type: 'PHOEBE',
    color: '#D0D0D0', // Более темный серый
    particleCount: 8500,
    radius: 0.6, // Увеличено в 2 раза (было 0.3)
    hasRings: false,
    shape: 'model',
    modelPath: '/models/moons/phoebe.glb',
  },
};

// Порядок переключения: Сатурн всегда первый, затем спутники
export const PLANET_ORDER: PlanetType[] = [
  'SATURN',
  'HYPERION',
  'EPIMETHEUS',
  'TELESTO',
  'PHOEBE',
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

