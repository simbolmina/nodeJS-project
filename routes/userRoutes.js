const express = require('express');

//multer package is for uploading complex, multi optional documents.
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

router.use(authController.protect);
//this is a middleware and by design middleware runs in sequense. so using authController.protect as a middleware is to apply all other middleware comes after it so we dont need add protect for each of routes by adding here.

router.patch('/updateMyPassword', authController.updatePassword);
// authController.protect,
router.get('/me', userController.getMe, userController.getUser);
// authController.protect,

router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));
// only admin will be able use these routes

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .post(userController.createUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
