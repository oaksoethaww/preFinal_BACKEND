import { endpoint, database, json } from '@/lib/auth';
export { OPTIONS } from '@/lib/auth';
export const POST = endpoint(async (req, context, user) => {
 await (await database()).collection('sessions').deleteOne({ _id: user.sid });
 const response = json({ message: 'Logout successful' });
 response.cookies.set('token', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0, secure: process.env.NODE_ENV === 'production' });
 return response;
});
