// Shared authentication, authorization and validation for the existing route files.
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { getClientPromise } from './mongodb';
import starterCorsHeaders from './cors';
const corsHeaders = { ...starterCorsHeaders, 'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN || starterCorsHeaders['Access-Control-Allow-Origin'], 'Cache-Control': 'no-store', Vary: 'Origin' };
export function clientPromise() {
 if (!globalThis.libraryMongoPromise) globalThis.libraryMongoPromise = getClientPromise().catch(error => { globalThis.libraryMongoPromise = null; throw error; });
 return globalThis.libraryMongoPromise;
}
export function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
export function json(data, status = 200) { return NextResponse.json(data, { status, headers: corsHeaders }); }
export function OPTIONS() { return new Response(null, { status: 204, headers: corsHeaders }); }
export async function database() { return (await clientPromise()).db(process.env.MONGODB_DB || 'library_final'); }
export function id(value) { if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) fail(400, 'Invalid ID'); return new ObjectId(value); }
export async function body(req) { try { const value = await req.json(); if (!value || Array.isArray(value) || typeof value !== 'object') fail(400, 'Expected a JSON object'); return value; } catch { fail(400, 'Invalid JSON body'); } }
export async function authenticate(req, roles) {
 let claims;
 const bearer = req.headers.get('authorization');
 const token = bearer ? bearer.replace(/^Bearer\s+/i, '') : req.cookies.get('token')?.value;
 try { claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); } catch { fail(401, 'Authentication required'); }
 if (!claims.sid || !claims.id) fail(401, 'Invalid session');
 const db = await database();
 const session = await db.collection('sessions').findOne({ _id: claims.sid, userId: claims.id, expiresAt: { $gt: new Date() } });
 if (!session) fail(401, 'Session expired');
 const user = await db.collection('users').findOne({ _id: id(claims.id), status: 'ACTIVE' });
 if (!user) fail(401, 'Account unavailable');
 if (roles && !roles.includes(user.role)) fail(403, 'You do not have permission to perform this operation');
 return { ...user, sid: claims.sid };
}
export function endpoint(fn, roles = null, publicRoute = false) {
 return async (req, context) => {
  try {
   if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin');
    if (origin && origin !== corsHeaders['Access-Control-Allow-Origin'] && origin !== new URL(req.url).origin) fail(403, 'Origin not allowed');
   }
   // Only login may bypass JWT verification; bootstrap/setup also requires ADMIN.
   const isLogin = publicRoute && new URL(req.url).pathname === '/api/user/login';
   const user = isLogin ? null : await authenticate(req, roles || (publicRoute ? ['ADMIN'] : null));
   return await fn(req, context, user);
  } catch (error) {
   if (!error.status) console.error('API error:', error.message);
   return json({ message: error.status ? error.message : 'Service unavailable. Check the database configuration.' }, error.status || 503);
  }
 };
}
export function bookData(data, partial = false) {
 const result = {};
 for (const field of ['title', 'author', 'location']) {
  if (partial && data[field] === undefined) continue;
  if (typeof data[field] !== 'string' || !data[field].trim() || data[field].length > 300) fail(400, `${field} must contain 1–300 characters`);
  result[field] = data[field].trim();
 }
 if (!partial || data.quantity !== undefined) {
  if (!Number.isSafeInteger(data.quantity) || data.quantity < 0 || data.quantity > 1000000) fail(400, 'Quantity must be an integer from 0 to 1000000');
  result.quantity = data.quantity;
 }
 if (!Object.keys(result).length) fail(400, 'No valid book fields supplied');
 return result;
}
export function publicUser(user) { return { id: user._id.toString(), email: user.email, name: user.username, role: user.role }; }
