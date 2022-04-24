const multer = require('multer');
const sharp = require('sharp');
//image processing library. we use it when resize uploaded photos
const AppError = require('../utils/appError');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

//where and how we want to store uploaded pictures. this is configuration function for multer storage.
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//     //cb is stands for callback. similar to next().
//     //null is for error configuration. see multerFilter() for an example
//   },
//   filename: (req, file, cb) => {
//     //we define a file name for uploaded files.
//     //user-userid-timestamp.fileextention(jpg)
//     const extentionName = file.mimetype.split('/')[1];
//     //format of this syntax (mimetype) comes from multer
//     cb(null, `user-${req.user.id}-${Date.now()}.${extentionName}`);
//   },
// });

//multerStorge was a function where and how we wanted to store uploaded photos but when user upload pictures too big or not square we need to resize them. so we save photo to merory first as a buffer and resize it in resizeUserPhoto() middleware (see below)
const multerStorage = multer.memoryStorage();

//we only want images to be uploded. this is filtering function for multer.
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
//with multer we created upload. with upload we created a middleware (upload.single) and added it to '/updaateMe' route.
//with dest option we define where to upload pictures or else it will stay on memory for a while then dissapear

exports.uploadUserPhoto = upload.single('photo');
//upload.single is "single" because we have only a single file and name of the field is 'photo' which is gonna hold those uploads.

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  sharp(req.file.buffer)
    .resize(500, 500) //resize to 500x500px
    .toFormat('jpeg') // format should be jpeg
    .jpeg({ quality: 90 }) // compress it to %90
    .toFile(`public/img/users/${req.file.filename}`); //write photo this folder after resizing.

  next();
});

const filterObj = (obj, ...allowedFieleds) => {
  // return obj.filter(el=> allowedFieleds)
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFieleds.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getAllUsers = factory.getAll(User);
// exports.getAllUsers = catchAsync(async (req, res, next) => {
//   const user = await User.find();

//   res.status(200).json({
//     status: 'success',
//     results: user.length,
//     data: {
//       user,
//     },
//   });
// });

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file);
  // console.log(req.body);

  //create and error if its user tries to POST password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password update. Use /updateMyPassword',
        400
      )
    ); //bad request
  }

  //this will allow user only update these properties so they cant abuse this cant change themseleves as admin etc
  const filteredBody = filterObj(req.body, 'name', 'email');
  //if there is a fhotop in updateMe, update object will be this photo instead of name and email. so we will upload photo to database.
  if (req.file) filteredBody.photo = req.file.filename;

  //update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    //204 deleted
    status: 'success',
    data: null,
  });
});

//Using factory handlers for admin account
// signup is to create user so we actually dont need this
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

// dont update password with this.
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);

exports.getUser = factory.getOne(User);

// exports.getUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not yet defined',
//   });
// };
