import { endpoint, database, body, bookData, id, fail, json } from '@/lib/auth';
export { OPTIONS } from '@/lib/auth';
export const GET = endpoint(async (req, { params }, user) => {
 const filter = { _id: id((await params).id) };
 if (user.role !== 'ADMIN') filter.status = 'ACTIVE';
 const book = await (await database()).collection('books').findOne(filter);
 if (!book) fail(404, 'Book not found');
 return json(book);
});
export const PATCH = endpoint(async (req, { params }) => {
 const data = bookData(await body(req), true);
 const book = await (await database()).collection('books').findOneAndUpdate({ _id: id((await params).id), status: 'ACTIVE' }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: 'after' });
 if (!book) fail(404, 'Active book not found');
 return json(book);
}, ['ADMIN']);
export const DELETE = endpoint(async (req, { params }) => {
 const book = await (await database()).collection('books').findOneAndUpdate({ _id: id((await params).id), status: 'ACTIVE' }, { $set: { status: 'DELETED', deletedAt: new Date() } }, { returnDocument: 'after' });
 if (!book) fail(404, 'Active book not found');
 return json(book);
}, ['ADMIN']);
