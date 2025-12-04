require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');

const session = require('express-session');
const { RedisStore } = require("connect-redis");
const  redisClient = require('./config/redis');

const authRoutes = require('./routes/authRoutes.js');
const computerRoutes = require('./routes/computerRoutes.js');
const sessionRoutes = require('./routes/sessionRoutes.js');
const userRoutes = require('./routes/userRouters.js');

const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    store: new RedisStore({ client: redisClient }), 
    secret: process.env.SESSION_SECRET || 'super_secret_cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use('/auth', authRoutes);
app.use('/computer', computerRoutes);
app.use('/session', sessionRoutes);
app.use('/user', userRoutes);

app.get('/', (req, res) => {
  res.redirect('/computer');
});

app.listen(PORT, () => {
  console.log(`\n--- Server running on http://localhost:${PORT} ---`);
  console.log(`Example: Database URL is ${process.env.DATABASE_URL ? 'Loaded' : 'Missing'}\n`);
});