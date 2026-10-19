import { endpoint, json, publicUser } from '@/lib/auth';
export { OPTIONS } from '@/lib/auth';
export const GET = endpoint(async (req, context, user) => json(publicUser(user)));
