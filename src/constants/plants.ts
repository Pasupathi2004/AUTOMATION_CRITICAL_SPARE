export type Plant = 'plant1' | 'plant2';

export const PLANTS: { id: Plant; label: string }[] = [
  { id: 'plant1', label: 'Plant 1' },
  { id: 'plant2', label: 'Plant 2' },
];

export const PLANT_LABELS: Record<Plant, string> = {
  plant1: 'Plant 1',
  plant2: 'Plant 2',
};
