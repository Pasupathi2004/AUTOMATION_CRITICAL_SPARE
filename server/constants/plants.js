export const PLANTS = ['plant1', 'plant2'];

export const PLANT_LABELS = {
  plant1: 'Plant 1',
  plant2: 'Plant 2',
};

export function isValidPlant(plant) {
  return PLANTS.includes(plant);
}

export function getPlant(req) {
  return req.user?.plant || 'plant1';
}

export function plantCollectionName(base, plant) {
  return `${base}_${plant}`;
}
