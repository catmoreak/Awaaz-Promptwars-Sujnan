import { features } from '../src/config';
import { db } from '../src/db';
import { photoKey } from '../src/reports';
import { getObject, putObject } from '../src/storage';

/** Moves photos saved before object storage, or saved while it was down. Safe to run more than once. */
if (!features.objectStorage) throw new Error('Set the AWS_ and S3_BUCKET variables first');

const images = await db.reportImage.findMany({ where: { storageKey: null, bytes: { not: null } } });
for (const image of images) {
  const body = Buffer.from(image.bytes as Uint8Array);
  const storageKey = photoKey(image.mime);
  await putObject(storageKey, body, image.mime);
  // Reads it back before clearing the database copy, so a bad upload cannot lose the photo.
  if (!(await getObject(storageKey)).equals(body)) throw new Error(`Upload check failed for report ${image.reportId}`);
  await db.reportImage.update({ where: { reportId: image.reportId }, data: { storageKey, bytes: null } });
}

console.log(`Moved ${images.length} photo(s) to object storage.`);
await db.$disconnect();
