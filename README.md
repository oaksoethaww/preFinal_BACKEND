# Library Management API

Next.js 16, MongoDB, bcrypt and JWT. Uses the original starter files; no backend source files have been added. The supplied singular `/api/book` routes remain; Next.js rewrites also expose the required plural `/api/books` routes without changing the folder structure.

## Run

Requires Node.js 20.19+ (or 22.12+) and a MongoDB **replica set**, such as MongoDB Atlas. Transactions protect acceptance/cancellation and book quantity updates.

1. Run `npm install`.
2. Configure the existing `.env.local` (never commit it):

```dotenv
MONGODB_URI=PASTE_YOUR_PRIVATE_ATLAS_URI_HERE
MONGODB_DB=library_final
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
ADMIN_SETUP_PASS=REPLACE_WITH_A_DIFFERENT_RANDOM_SECRET
FRONTEND_ORIGIN=http://localhost:5173
SEED_ADMIN_PASSWORD=SET_TO_THE_ADMIN_PASSWORD_FROM_THE_EXAM
SEED_USER_PASSWORD=SET_TO_THE_USER_PASSWORD_FROM_THE_EXAM
```

3. Run `npm run dev` (port 3000). Use `npm run build` and `npm start` for production.
4. Login initializes indexes and the required test users automatically. Alternatively, while authenticated as ADMIN, call `/admin/initial?pass=YOUR_ADMIN_SETUP_PASS` once. The setup password alone does not bypass JWT authorization. Setup does not overwrite existing accounts.

| Role | Email | Password configuration |
| --- | --- | --- |
| ADMIN | admin@test.com | Use the ADMIN password from the examination |
| USER | user@test.com | Use the USER password from the examination |

The backend template uses system fonts so production builds do not depend on Google Fonts access.

## API

All service endpoints require authentication except login. Initialization additionally requires an ADMIN JWT and the setup password. OPTIONS responds to browser preflight requests. JWTs use HTTP-only cookies; Bearer JWTs are also supported. JWT sessions expire after one day and are revoked on logout. Roles are verified against the database on every service request.

| Method | Path | Permission / body |
| --- | --- | --- |
| POST | `/api/user/login` | `{ "email": "…", "password": "…" }` |
| POST | `/api/user/logout` | Authenticated; revokes session and removes cookie |
| GET | `/api/user/profile` | Current authenticated user, no password/hash |
| POST | `/api/user` | ADMIN; create USER with email, username and password |
| GET | `/api/books` | Both roles; optional `title`, `author`, `status` query parameters |
| POST | `/api/books` | ADMIN; title, author, integer quantity >= 0, location |
| GET | `/api/books/{id}` | Both roles; deleted books visible only to ADMIN |
| PATCH | `/api/books/{id}` | ADMIN; one or more editable book fields |
| DELETE | `/api/books/{id}` | ADMIN; sets status DELETED (soft delete) |
| GET | `/api/borrow` | ADMIN sees all; USER sees only their own requests |
| POST | `/api/borrow` | USER; `{ "bookId": "…", "targetDate": "YYYY-MM-DD" }` |
| PATCH | `/api/borrow` | `{ "id": "REQUEST_ID", "status": "…" }`; role and ownership checks |

Search is case-insensitive literal substring matching; title and author filters combine. USER lists exclude deleted books; direct lookups return 404. Explicit USER requests for deleted lists return 403. ADMIN defaults to all books and can filter ACTIVE or DELETED. Quantity means currently available copies.

Unauthenticated requests return 401, role/ownership violations return 403, invalid IDs/data return 400, missing records return 404, and invalid status transitions return 409. Responses use `{ "message": "…" }` for errors.

## Request lifecycle

- USER request: server supplies user ID, email, book title and createdAt. Future/today pickup dates are validated. Starts INIT, or CLOSE-NO-AVAILABLE-BOOK when quantity is zero.
- ADMIN can move INIT to ACCEPTED, CANCEL-ADMIN or CLOSE-NO-AVAILABLE-BOOK. Closing for no stock is rejected if active copies exist.
- Acceptance atomically reserves one active copy. If a competing request took the last copy, the request closes as CLOSE-NO-AVAILABLE-BOOK instead.
- USER can cancel their own INIT/ACCEPTED request as CANCEL-USER. ADMIN can cancel either as CANCEL-ADMIN.
- Cancelling ACCEPTED restores exactly one copy, including when its book was subsequently soft-deleted. Terminal requests cannot transition again.
- Transactions require a replica set; a standalone `mongod` is insufficient.

## Validation and submission

`npm run lint` and `npm run build` validate this project. The earlier external verification suite passed 53 real Atlas HTTP checks, including competing acceptance, permissions, session revocation and backend-restart persistence. The primary application database was also verified through the browser and direct Atlas reads. Extra verification files were moved outside this source-only workspace during cleanup.

Publish this folder as its own repository. Do not publish `.env.local`, `node_modules`, `.next` or database files. For grading, configure your own Atlas database user/URI, allow the exam-required `0.0.0.0/0` network access in Atlas for the specified period, and verify the grader can open the repository. Cloud setup and repository submission are separate from the local implementation.

Strict TODO-only compliance is not established. Existing login, profile, logout, registration, index initialization, bootstrap and rewrite configuration require repairs outside literal TODO areas in this starter. The template uses system fonts because external font downloads failed in this environment. MongoDB connection code, CORS helper and global CSS were restored to their original versions; pooling, CORS customization and setup authorization live in the authentication TODO implementation. Obtain instructor approval for the remaining necessary repairs. The starter dependencies also have known npm audit findings; updating pinned framework manifests needs an instructor-approved exception under a literal TODO-only rule. No route directories were added or moved.

Rewrites reference: https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites

## Final security and compliance status

Compatible lockfile security updates were applied without changing package.json or the pinned Next.js version. Backend lint/build and the 57-check real Atlas suite passed afterward, including initialization authorization and process-restart persistence. The remaining npm audit result is 8 advisories (7 high, 1 critical), including the pinned Next.js version and its image/CSS dependencies, plus lint-tool dependencies. The reported Next.js fix requires a version outside the current pinned range. Do not treat runtime tests as a clean security audit; get instructor approval for the required manifest upgrades.

The published Git history was checked with Gitleaks and exact matching against saved runtime credentials. No saved credentials, plaintext exam passwords, environment files, dependencies or build output are tracked. Test account passwords must be supplied privately through the ignored environment settings shown above.
