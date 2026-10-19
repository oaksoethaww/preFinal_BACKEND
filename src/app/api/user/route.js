// Account creation is an authenticated administrative operation.
import bcrypt from 'bcrypt';
import { endpoint, body, database, fail, json } from '@/lib/auth';
export { OPTIONS } from '@/lib/auth';
export const POST = endpoint(async req => {
 const data = await body(req);
 if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || typeof data.username !== 'string' || !data.username.trim() || typeof data.password !== 'string' || data.password.length < 6 || data.password.length > 128) fail(400, 'Valid email, username and password (6–128 characters) are required');
 const db = await database();
 try {
  const result = await db.collection('users').insertOne({ email: data.email.trim().toLowerCase(), username: data.username.trim(), password: await bcrypt.hash(data.password, 10), role: 'USER', status: 'ACTIVE' });
  return json({ id: result.insertedId }, 201);
 } catch (error) { if (error.code === 11000) fail(409, 'Email or username already exists'); throw error; }
}, ['ADMIN']);
