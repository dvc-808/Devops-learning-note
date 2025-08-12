// Import Express
const express = require('express');
const app = express();

// Define a simple route
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
