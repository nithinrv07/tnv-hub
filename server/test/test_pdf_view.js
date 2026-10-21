const fs = require('fs');
const http = require('http');

http.get('http://localhost:3000/api/profiles', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const nithin = json.profiles.find(p => p.username === 'NITHINSJ');
    if (!nithin) {
      console.error('Nithin not found');
      return;
    }
    console.log('Testing PDF for:', nithin.username);
  });
});
