// BCrypt hash for password: Staff@1234
// Generated with rounds=10 using Python bcrypt
var newHash = "$2b$10$Ga9B9U3JrCJoqmygWu/Pe.YFiPfsgMpu4xzX/SBHZiaGEZALn6Vha";

// Update all non-student users: set password_hash and clear mustChangePassword
var result = db.users.updateMany(
  { role: { $ne: "STUDENT" } },
  { $set: { password_hash: newHash, must_change_password: false } }
);

print("=== Password Reset Complete ===");
print("Matched:  " + result.matchedCount);
print("Modified: " + result.modifiedCount);
print("");
print("Staff/Admin accounts (now all use password: Staff@1234):");
db.users.find(
  { role: { $ne: "STUDENT" } },
  { username: 1, role: 1, campus_id: 1, password_hash: 1, must_change_password: 1 }
).forEach(function(u) {
  print("  username=" + u.username + "  role=" + u.role + "  campus=" + u.campus_id + "  hashSet=" + !!u.password_hash);
});
