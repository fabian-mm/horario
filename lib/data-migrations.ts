import "server-only";

import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { normalizeSubjectName, type Subject } from "@/lib/subjects";
import type { ActivityType } from "@/lib/activity-types";

type MigrationDocument = {
  userId: string;
  key: string;
  completedAt: string;
};

type SubjectDocument = Subject & {
  userId: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
};

async function runOnce(db: Db, userId: string, key: string, migrate: () => Promise<void>) {
  const migrations = db.collection<MigrationDocument>("userMigrations");
  if (await migrations.findOne({ userId, key })) return;
  await migrate();
  await migrations.updateOne(
    { userId, key },
    { $setOnInsert: { userId, key, completedAt: new Date().toISOString() } },
    { upsert: true },
  );
}

export async function ensureSubjectCatalogMigration(db: Db, userId: string) {
  await runOnce(db, userId, "subject-catalog-v1", async () => {
    const missionNames = await db.collection("missions").distinct<string>("subject", { userId });
    const weeklyDocuments = await db.collection("weeklyQuests")
      .find({ userId })
      .project<{ dailyMissions?: Array<{ subject?: string }> }>({ dailyMissions: 1 })
      .toArray();
    const usedNames = Array.from(new Set([
      ...missionNames,
      ...weeklyDocuments.flatMap((week) => week.dailyMissions?.map((daily) => daily.subject ?? "") ?? []),
    ].map((name) => name.trim()).filter(Boolean)));
    const collection = db.collection<SubjectDocument>("subjects");
    const knownSubjects = await collection.find({ userId }).toArray();
    const knownNames = new Set(
      knownSubjects
        .flatMap((subject) => [subject.name, ...(subject.aliases ?? [])])
        .map(normalizeSubjectName),
    );
    const now = new Date().toISOString();

    for (const name of usedNames) {
      const normalizedName = normalizeSubjectName(name);
      if (knownNames.has(normalizedName)) continue;
      await collection.updateOne(
        { userId, normalizedName },
        { $setOnInsert: { id: randomUUID(), userId, name, normalizedName, aliases: [], createdAt: now, updatedAt: now } },
        { upsert: true },
      );
      knownNames.add(normalizedName);
    }

    const subjects = await collection.find({ userId }).toArray();
    await Promise.all(subjects.flatMap((subject) => {
      const names = Array.from(new Set([subject.name, ...(subject.aliases ?? [])]));
      return [
        db.collection("missions").updateMany(
          { userId, subject: { $in: names } },
          { $set: { subjectId: subject.id, subject: subject.name } },
        ),
        db.collection("weeklyQuests").updateMany(
          { userId, "dailyMissions.subject": { $in: names } },
          { $set: { "dailyMissions.$[daily].subjectId": subject.id, "dailyMissions.$[daily].subject": subject.name } },
          { arrayFilters: [{ "daily.subject": { $in: names } }] },
        ),
      ];
    }));
  });
}

export async function ensureActivityTypeLinksMigration(
  db: Db,
  userId: string,
  fallbackType?: ActivityType,
) {
  if (!fallbackType) return;
  await runOnce(db, userId, "activity-type-links-v1", async () => {
    await db.collection("weeklyQuests").updateMany(
      { userId, dailyMissions: { $elemMatch: { activityTypeId: { $exists: false } } } },
      { $set: {
        "dailyMissions.$[activity].activityTypeId": fallbackType.id,
        "dailyMissions.$[activity].activityTypeName": fallbackType.name,
        "dailyMissions.$[activity].activityCategory": fallbackType.category,
        "dailyMissions.$[activity].activityPoints": fallbackType.points,
      } },
      { arrayFilters: [{ "activity.activityTypeId": { $exists: false } }] },
    );
  });
}
