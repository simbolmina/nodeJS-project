const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet'); //security package comes with 14 options
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

const app = express();

//in order to set our backend and service to client we use template engines. in this case we use pug and we set it right starting of the app.js
app.set('view engine', 'pug');
//express support this natively and we dont require or install pug
//after setting engine, we tell express where views are. we could just tell './views' but directory locations are relative so we use native path module and tell it where like this.
app.set('views', path.join(__dirname, 'views'));

////////GLOBAL MIDDLEWARES /////////

//serving static files
// app.use(express.static(`${__dirname}/public`)); //how to serve static files
app.use(express.static(path.join(__dirname, 'public'))); //how to serve static files

//security http headers
app.use(helmet());

//development logging

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); //this is a 3rd party login middleware
}

//limit requests from same API

const limiter = rateLimit({
  max: 100, //how many requests per ip. this is not login attemp; all activities with http request. so dont make app unusable
  windowsMs: 60 * 60 * 1000, //time window in miliseconds
  message: 'Too many requests from this IP, please try again in an hour',
});

app.use('/api', limiter); //this will be used all of our APIs

//body parser, reading data from body to into req.body

app.use(express.json({ limit: '10kb' })); //this is middleware. with limit, if a body larger than 10k comes it will not be accepted. this is a security middle ware.

//Data sanitizations aginst NoQSL query injection
app.use(mongoSanitize()); //clean $ from inputs to prevent  "email" : {"$gt": ""},

//Data sanitization agains XSS
app.use(xss()); //clean malitious html + js code from requests

app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAvarage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ], //we allow duration to be used more than once
  })
); //prevent parameter pollution (to clean up query, prevents double query calls sent by attackers)

// app.use((req, res, next) => {
//   //this middleware has to be called before routes
//   console.log('hello from middleware');
//   next(); //this call is a must
// });

//test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

/// ROUTES

app.get('/', (req, res) => {
  res.status(200).render('base');
});

app.use('/api/v1/tours', tourRouter); // mounting a new router to route bas
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

//if any response dont hit upper routers and reach here, we give an error. so all undefined requests will get this error instead of a html

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  //when we insert anything to next() its always error
});

app.use(globalErrorHandler);

module.exports = app;
