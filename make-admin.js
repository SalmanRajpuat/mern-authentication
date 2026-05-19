// Quick Script to Make User Admin
// Run this in MongoDB Compass or mongosh

// Replace 'your.email@example.com' with the actual email
db.users.updateOne(
  { email: "your.email@example.com" },
  { $set: { role: "admin" } }
)

// Verify the update
db.users.findOne({ email: "your.email@example.com" }, { role: 1, name: 1, email: 1 })

// Make first user admin (if you don't know the email)
db.users.updateOne(
  {},
  { $set: { role: "admin" } }
)

// Make all users admin (for testing)
db.users.updateMany(
  {},
  { $set: { role: "admin" } }
)
