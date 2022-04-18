const express = require('express');

const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });
//by design each routes reaches what we defines and when we need to do same thing we dont need to rewrite same code bu mergeroutes with this option so our route can reach other routes params

router.use(authController.protect);

router.route('/').get(reviewController.getAllReviews).post(
  // authController.protect,
  authController.restrictTo('user'),
  reviewController.setTourUserIds,
  reviewController.createReview
);

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
