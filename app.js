const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
//security package comes with 14 options
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.enable('trust proxy');
//this is for heroku to work properly with createSendToken function in authCont

//in order to set our backend and service to client we use template engines. in this case we use pug and we set it right starting of the app.js
app.set('view engine', 'pug');
//express support this natively and we dont require or install pug
//after setting engine, we tell express where views are. we could just tell './views' but directory locations are relative so we use native path module and tell it where like this.
app.set('views', path.join(__dirname, 'views'));

////////GLOBAL MIDDLEWARES /////////
//implement cors

app.use(cors());
//allow everyone to access to our api
// app.use(cors({
//   origin: 'https://www.natours.com'
//   //only this domain can use our api
// }))

app.options('*', cors());
// app.options('/api/v1/tours/:id', cors());
//only this route can be used.
//non simple requests (patch, put, delete) has a pre-flight phahse which called options request and we need to allow other domains to use our apis non simple requests as well

//serving static files
// app.use(express.static(`${__dirname}/public`)); //how to serve static files
app.use(express.static(path.join(__dirname, 'public'))); //how to serve static files. this includes css files as well. thats why we dont need to show css folder to pug files.

//security http headers
app.use(helmet());

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:', 'blob:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:', 'blob:'],
      scriptSrc: ["'self'", 'https://*.cloudflare.com'],
      scriptSrc: ["'self'", 'https://*.stripe.com'],
      scriptSrc: ["'self'", 'https://*.mapbox.com'],
      frameSrc: ["'self'", 'https://*.stripe.com'],
      objectSrc: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
      workerSrc: ["'self'", 'data:', 'blob:'],
      childSrc: ["'self'", 'blob:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'blob:', 'https://*.mapbox.com'],
      upgradeInsecureRequests: [],
    },
  })
);

// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
//         baseUri: ["'self'"],
//         fontSrc: ["'self'", 'https:', 'data:'],
//         scriptSrc: [
//           "'self'",
//           'https:',
//           'http:',
//           'blob:',
//           'https://*.mapbox.com',
//           'https://js.stripe.com',
//           'https://*.cloudflare.com',
//         ],
//         frameSrc: ["'self'", 'https://js.stripe.com'],
//         objectSrc: ['none'],
//         styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
//         workerSrc: ["'self'", 'data:', 'blob:'],
//         childSrc: ["'self'", 'blob:'],
//         imgSrc: ["'self'", 'data:', 'blob:'],
//         connectSrc: [
//           "'self'",
//           'blob:',
//           'wss:',
//           'https://*.tiles.mapbox.com',
//           'https://api.mapbox.com',
//           'https://events.mapbox.com',
//         ],
//         upgradeInsecureRequests: [],
//       },
//     },
//   })
// );

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

//we need this for complex (big) data coming from url (query);
//we use this for updating user info
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//cookie parser.
app.use(cookieParser());

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

app.use(compression());

//test middleware
// app.use((req, res, next) => {
//   req.requestTime = new Date().toISOString();
//   // console.log(req.headers);
//   // console.log(req.cookieParser);
//   next();
// });

/// ROUTES

app.use('/', viewRouter);
app.use('/login', viewRouter);
app.use('/api/v1/tours', tourRouter); // mounting a new router to route bas
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter);

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
