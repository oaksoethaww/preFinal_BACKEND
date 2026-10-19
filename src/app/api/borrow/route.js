import { endpoint, database, body, id, fail, json, clientPromise } from '@/lib/auth';
export { OPTIONS } from '@/lib/auth';
export const GET = endpoint(async (req, context, user) => {
 const db = await database();
 const filter = user.role === 'ADMIN' ? {} : { userId: user._id.toString() };
 const rows = await db.collection('borrows').find(filter).sort({ createdAt: -1 }).toArray();
 return json(rows);
});
export const POST = endpoint(async (req, context, user) => {
 const data = await body(req);
 const bookId = id(data.bookId);
 if (typeof data.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.targetDate)) fail(400, 'Target date must be YYYY-MM-DD');
 const date = new Date(`${data.targetDate}T00:00:00.000Z`);
 if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== data.targetDate || data.targetDate < new Date().toISOString().slice(0,10)) fail(400, 'Choose a valid target date today or later');
 const db = await database();
 const book = await db.collection('books').findOne({ _id: bookId, status: 'ACTIVE' });
 if (!book) fail(404, 'Book not found');
 const request = { userId: user._id.toString(), userEmail: user.email, bookId: bookId.toString(), bookTitle: book.title, createdAt: new Date(), targetDate: data.targetDate, status: book.quantity > 0 ? 'INIT' : 'CLOSE-NO-AVAILABLE-BOOK' };
 const result = await db.collection('borrows').insertOne(request);
 return json({ ...request, _id: result.insertedId }, 201);
}, ['USER']);
export const PATCH = endpoint(async (req, context, user) => {
 const data = await body(req);
 const requestId = id(data.id);
 const allowed = user.role === 'ADMIN' ? ['ACCEPTED','CANCEL-ADMIN','CLOSE-NO-AVAILABLE-BOOK'] : ['CANCEL-USER'];
 if (!allowed.includes(data.status)) fail(403, 'This status is not permitted for your role');
 const client = await clientPromise();
 const session = client.startSession();
 let result;
 try {
  await session.withTransaction(async () => {
   const db = client.db(process.env.MONGODB_DB || 'library_final');
   const requests = db.collection('borrows');
   const request = await requests.findOne({ _id: requestId }, { session });
   if (!request) fail(404, 'Request not found');
   if (user.role !== 'ADMIN' && request.userId !== user._id.toString()) fail(403, 'You can only cancel your own requests');
   if (!['INIT','ACCEPTED'].includes(request.status) || (request.status === 'ACCEPTED' && !data.status.startsWith('CANCEL-'))) fail(409, 'This request cannot transition to that status');
   const books = db.collection('books');
   let nextStatus = data.status;
   if (data.status === 'ACCEPTED') {
    const reserved = await books.findOneAndUpdate({ _id: id(request.bookId), status: 'ACTIVE', quantity: { $gt: 0 } }, { $inc: { quantity: -1 } }, { session });
    if (!reserved) nextStatus = 'CLOSE-NO-AVAILABLE-BOOK';
   } else if (data.status === 'CLOSE-NO-AVAILABLE-BOOK') {
    const book = await books.findOne({ _id: id(request.bookId), status: 'ACTIVE', quantity: { $gt: 0 } }, { session });
    if (book) fail(409, 'Copies are available; accept or cancel this request');
   }
   if (request.status === 'ACCEPTED') await books.updateOne({ _id: id(request.bookId) }, { $inc: { quantity: 1 } }, { session });
   result = await requests.findOneAndUpdate({ _id: requestId, status: request.status }, { $set: { status: nextStatus, updatedAt: new Date() } }, { session, returnDocument: 'after' });
  });
 } finally { await session.endSession(); }
 return json(result);
});
