const bcrypt = require('bcryptjs');

const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const password = 'password123';

bcrypt.compare(password, hash).then(match => {
  console.log('Hash matches password123:', match);
  if (!match) {
    console.log('Hash is invalid. Generating a new one...');
    return bcrypt.hash(password, 10).then(newHash => {
      console.log('New hash for password123:', newHash);
    });
  }
});
