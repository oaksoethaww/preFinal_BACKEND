import { ensureIndexes } from '@/lib/ensureIndexes';
import { endpoint, fail, json } from '@/lib/auth';
export const GET = endpoint(async req => {
 if (!process.env.ADMIN_SETUP_PASS || new URL(req.url).searchParams.get('pass') !== process.env.ADMIN_SETUP_PASS) fail(403, 'Invalid setup password');
 await ensureIndexes();
 return json({ message: 'Indexes and required test users initialized' });
}, null, true);
