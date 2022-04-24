const express = require('express');
const viewController = require('./../controllers/viewsController');
const authController = require('./../controllers/authController');
const bookingController = require('./../controllers/bookingController');

const router = express.Router();

// router.use(authController.isLoggedIn);
//we want this middleware to apply all routes.

// router.get('/', (req, res) => {
//   res.status(200).render('base', {
//     tour: 'The Forest Hiker',
//     user: 'Bilal',
//     //these varialbles are called locals in pug files and they can be used/called in those files.
//   });
// });

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewController.getOverview
);

// router.get('/overview', (req, res) => {
//   res.status(200).render('overview', {
//     title: 'All Tours',
//   });
// });

router.get('/tour/:slug', authController.isLoggedIn, viewController.getTour);
// router.get('/tour/:slug', authController.protect, viewController.getTour);
// router.get('/tour', (req, res) => {
//   res.status(200).render('tour', {
//     title: 'The Forest Hiker Tour',
//   });
// });

// /login route

router.get('/login', authController.isLoggedIn, viewController.getLogin);
router.get('/me', authController.protect, viewController.getAccount);
router.get('/my-tours', authController.protect, viewController.getMyTours);

// router.post(
//   '/submit-user-data',
//   authController.protect,
//   viewController.updateUserData
// );

module.exports = router;
