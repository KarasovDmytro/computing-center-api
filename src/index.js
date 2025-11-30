require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const computerRoutes = require('./routes/computerRoutes.js');


const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/computers', computerRoutes);

app.get('/', (req, res) => {
  res.send('<h1>Computing Center API is working! 🚀</h1>');
});

app.listen(PORT, () => {
  console.log(`\n--- Server running on http://localhost:${PORT} ---`);
  console.log(`Example: Database URL is ${process.env.DATABASE_URL ? 'Loaded' : 'Missing'}\n`);
});