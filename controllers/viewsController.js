const Tour = require('./../models/tourModel');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.getOverview = async (req, res, next) => {
  // get tour data from collection
  const tours = await Tour.find();

  // build tepmplate

  // render template using tour data from 1
  res.status(200).render('overview', {
    title: 'All Tours',
    //these varialbles are called locals in pug files and they can be used/called in those files.
    tours,
  });
};

exports.getTour = async (req, res, next) => {
  // 1 get the data for the tour (includes reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is not tour with that name', 404));
  }

  // console.log(tour);

  // build template

  // render template using data from 1
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      'connect-src https://*.tiles.mapbox.com https://api.mapbox.com https://events.mapbox.com'
    )
    .render('tour', {
      title: tour.name,
      tour,
    });
};

exports.getLogin = async (req, res, next) => {
  res.status(200).render('login', {
    title: 'Login',
  });
};

exports.getAccount = (req, res, next) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};

// exports.updateUserData = catchAsync(async (req, res, next) => {
//   console.log('update user data', req.body);
//   //we have two seperate api for user info and password changes. password change can not be done with findByIdAndUpdate() function since we can not run security middlewares
//   const updatedUser = await User.findByIdAndUpdate(
//     req.user.id,
//     {
//       name: req.body.name,
//       email: req.body.email,
//     },
//     {
//       new: true,
//       runValidators: true,
//     }
//   );

//after updating user info we render the same page with new data

//   res.status(200).render('account', {
//     title: 'Your Account',
//     user: updatedUser,
//   });
// });
