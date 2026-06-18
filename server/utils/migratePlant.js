import mongoose from 'mongoose';
import { PLANTS, plantCollectionName } from '../constants/plants.js';
import { getInventoryModel, getTransactionModel, getRequestModel } from '../models/plantModels.js';

const LEGACY_COLLECTIONS = {
  inventories: 'inventories',
  transactions: 'transactions',
  requests: 'requests',
};

const MIGRATION_FLAG = 'plant_collections_v1';

function stripPlantField(doc) {
  const { plant, ...rest } = doc;
  return rest;
}

async function collectionExists(db, name) {
  const collections = await db.listCollections({ name }).toArray();
  return collections.length > 0;
}

async function migrateLegacyCollection(db, legacyName, baseName) {
  const legacyExists = await collectionExists(db, legacyName);
  if (!legacyExists) return 0;

  const legacy = db.collection(legacyName);
  const legacyCount = await legacy.countDocuments();
  if (legacyCount === 0) return 0;

  const docs = await legacy.find({}).toArray();
  let moved = 0;

  for (const plant of PLANTS) {
    const targetName = plantCollectionName(baseName, plant);
    const targetExists = await collectionExists(db, targetName);
    const target = db.collection(targetName);
    const targetCount = targetExists ? await target.countDocuments() : 0;

    if (targetCount > 0) {
      continue;
    }

    const plantDocs = docs
      .filter((doc) => {
        if (plant === 'plant1') {
          return !doc.plant || doc.plant === 'plant1';
        }
        return doc.plant === 'plant2';
      })
      .map(stripPlantField);

    if (plantDocs.length > 0) {
      await target.insertMany(plantDocs);
      moved += plantDocs.length;
      console.log(`Migrated ${plantDocs.length} documents from ${legacyName} to ${targetName}`);
    }
  }

  if (moved > 0) {
    await legacy.rename(`${legacyName}_legacy_backup`);
    console.log(`Renamed legacy collection ${legacyName} to ${legacyName}_legacy_backup`);
  }

  return moved;
}

export async function migratePlantCollections() {
  const db = mongoose.connection.db;
  if (!db) return;

  const flags = db.collection('app_migrations');
  const alreadyDone = await flags.findOne({ name: MIGRATION_FLAG });
  if (alreadyDone) {
    return;
  }

  let totalMoved = 0;
  totalMoved += await migrateLegacyCollection(db, LEGACY_COLLECTIONS.inventories, 'inventories');
  totalMoved += await migrateLegacyCollection(db, LEGACY_COLLECTIONS.transactions, 'transactions');
  totalMoved += await migrateLegacyCollection(db, LEGACY_COLLECTIONS.requests, 'requests');

  if (totalMoved > 0) {
    console.log(`Plant collection migration complete: ${totalMoved} documents moved`);
  }

  for (const plant of PLANTS) {
    getInventoryModel(plant);
    getTransactionModel(plant);
    getRequestModel(plant);
  }

  await flags.insertOne({
    name: MIGRATION_FLAG,
    completedAt: new Date(),
    documentsMoved: totalMoved,
  });
}
