const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const app = require('./app');

const DB = process.env.DATABASE_LOCAL;
const port = process.env.PORT || 7000;
mongoose.connect(DB).then(() => {
  console.log('Database connected successfully');
  app.listen(port, () => {
    console.log(`App running on port ${port}`);
  });
});
