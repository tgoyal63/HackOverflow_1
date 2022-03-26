require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dbConn = require('./utils/db-conn.utils.js');
const userRoutes = require('./routes/user.routes.js');

const app = express();
const port = parseInt(process.env.APP_PORT, 10) || 8082;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
    extended: true,
}));

/**
 * App Routes
 */
app.get('/', (req, res) => {
    res.send('Welcome to the Social Coding Experience Portal.');
    next();
});

app.use('/', userRoutes);

/**
 * To make sure, app start only if database is found
 */
dbConn.safeConnect().then(
    () => app.listen(port, () => console.log(`Webservice listening on port: ${port}`)),
);