const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 3000;

console.log('>>> Server file loaded');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
