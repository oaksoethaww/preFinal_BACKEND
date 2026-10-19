import { endpoint, database, body, bookData, json, fail } from '@/lib/auth';
export { OPTIONS } from '@/lib/auth';
export const GET = endpoint(async (req, context, user) => {
 const search = new URL(req.url).searchParams;
 const filter = user.role === 'ADMIN' ? {} : { status: 'ACTIVE' };
 const status = search.get('status');
 if (status) {
  if (!['ACTIVE','DELETED'].includes(status)) fail(400, 'Invalid book status');
  if (status === 'DELETED' && user.role !== 'ADMIN') fail(403, 'Deleted books are restricted to administrators');
  filter.status = status;
 }
 for (const field of ['title','author']) {
  const term = search.get(field);
  if (term) { if (term.length > 300) fail(400, 'Search term too long'); filter[field] = { $regex: Array.from(term, char => '. * + ? ^ $ { } ( ) | [ ] \\'.split(' ').includes(char) ? '\\' + char : char).join(''), $options: 'i' }; }
 }
 return json(await (await database()).collection('books').find(filter).sort({ title: 1 }).toArray());
});
export const POST = endpoint(async req => {
 const data = bookData(await body(req));
 const book = { ...data, status: 'ACTIVE', createdAt: new Date() };
 const result = await (await database()).collection('books').insertOne(book);
 return json({ ...book, _id: result.insertedId }, 201);
}, ['ADMIN']);
