db.users.updateMany({role: {$ne: 'STUDENT'}}, {$set: {password_hash: '$2b$12$Eagao0ZJ3tCObQ1xabP./OHcJjQkPozv8DUDQBiRR7lcQbNk6jreS'}});
