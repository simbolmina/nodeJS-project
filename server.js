const mongoose = require('mongoose');
const dotenv = require('dotenv');

// uncought expressions
// some says this is not a good practice

process.on('uncaughtException', (err) => {
  console.log('unhandled exeption // shutting down..');
  console.log(err, err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// console.log(process.env.NODE_ENV);

mongoose
  //.connect(process.env.DATABASE_LOCAL, { //local
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('db connection successfull'));
// .catch((err) => console.log('error'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log('App running on port ' + port);
});

//unhandled rejections which are coused because our app; like wrong password or down server

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('unhandled rejection // shutting down..');
  server.close(() => {
    process.exit(1);
  });
});

//heroku specific error to terminate program. it will be shutdown in every 24hours. so we do it `greacefully`
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down...');
  server.close(() => {
    console.log('SERVED CLOSED');
  });
});
