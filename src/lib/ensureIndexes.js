import bcrypt from 'bcrypt';
import { database } from './auth';
export async function ensureIndexes() {
 const db = await database();
 await db.collection('users').createIndex({ email: 1 }, { unique: true });
 await db.collection('users').createIndex({ username: 1 }, { unique: true });
 await db.collection('books').createIndex({ status: 1, title: 1, author: 1 });
 await db.collection('borrows').createIndex({ userId: 1, createdAt: -1 });
 await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
 for (const [email, role, envKey] of [['admin@test.com','ADMIN','SEED_ADMIN_PASSWORD'],['user@test.com','USER','SEED_USER_PASSWORD']]) {
  if (await db.collection('users').findOne({ email })) continue;
  const password = process.env[envKey];
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) throw new Error(`Configure ${envKey} with the test password specified in the examination`);
  await db.collection('users').updateOne({ email }, { $setOnInsert: { email, username: role.toLowerCase(), password: await bcrypt.hash(password, 10), role, status: 'ACTIVE' } }, { upsert: true });
 }
}
