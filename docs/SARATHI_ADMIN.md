# Sarathi admin review

The review queue is protected by the existing JWT role and is available at
`/sarathi/admin` or through `GET /api/admin/sarathi`. Decisions use
`PATCH /api/admin/sarathi/:driverId/approval` with `APPROVED`, `REJECTED`, or
`NEEDS_CORRECTION`. Admin responses omit complete Aadhaar and licence numbers.

There is no default admin account. Promote an existing trusted user through an
authorized MongoDB administration session. Example for MongoDB shell, after
choosing the correct database and replacing the email:

```javascript
db.users.updateOne(
  { email: "trusted-admin@example.com" },
  { $set: { role: "ADMIN" } }
)
```

Verify the matched account before doing this. That user signs in at
`/sarathi/admin` with the same email and password used for RideSync. Do this only
in the intended persistent database; changes in `npm run local` are disposable.

Admin approval is a review decision, not identity verification. In production,
dispatch separately requires `APPROVED` plus both documents marked `VERIFIED`
by `CASHFREE` in `live` mode. Demo verification cannot meet that condition.
