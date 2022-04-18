const Review = require('./../models/reviewModel');
// const catchAsync = require('./../utils/catchAsync');
// const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

exports.getAllReviews = factory.getAll(Review);
// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   let filter;
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   //this is a nested route to get reviews of certain tours reviews. if there is no id all reveiws will be shown, if yes then just a tour.

//   const reviews = await Review.find(filter);

//   if (!reviews) {
//     return next(new AppError('No reviews found', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     results: reviews.lenght,
//     data: {
//       reviews,
//     },
//   });
// });

//middleware for reading params for nested routes
exports.setTourUserIds = (req, res, next) => {
  //allow nested routes for route('/:id/reviews')
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// exports.createReview = catchAsync(async (req, res, next) => {
//   //   //allow nested routes for route('/:id/reviews')
//   //   if (!req.body.tour) req.body.tour = req.params.tourId;
//   //   if (!req.body.user) req.body.user = req.user.id;
//   //we moved this to upper function as middleware

//   const newReview = await Review.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });

exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
