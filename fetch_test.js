const http = require('http');
http.get('http://localhost:3000/api/services', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Services:', data));
});
http.get('http://localhost:3000/api/packages', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Packages:', data));
});
