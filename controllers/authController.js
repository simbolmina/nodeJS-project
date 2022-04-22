const crypto = require('crypto');
const { promisify } = require('util'); //promisify methods
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookiePoptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPRIES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true, //use only https
    httpOnly: true, //browser cant access/read/delete token (prevent attacks)
  };

  if (process.env.NODE_ENV === 'production') cookiePoptions.secure = true;

  res.cookie('jwt', token, cookiePoptions);

  user.password = undefined;
  //this will prevent us to send password output upon signup

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  createSendToken(newUser, 201, res);

  // const token = signToken(newUser._id);

  // //   const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
  // //     expiresIn: process.env.JWT_EXPIRES,
  // //   });

  // res.status(201).json({
  //   status: 'success',
  //   token,
  //   data: {
  //     user: newUser,
  //   },
  // });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1 check if email/password exits
  if (!email || !password) {
    return next(new AppError('Enter email and password', 400)); // bad request
  }

  // check user exists && password is correct

  const user = await User.findOne({ email }).select('+password');
  //password / select was false in order to avoid leaking info but we need it here to check if its legit. so we call it like this select('+password')

  // const correct = await user.correctPassword(password, user.password)
  //comes from userModel

  if (!user || !(await user.correctPassword(password, user.password))) {
    //if !user correct cant run so we moved it here
    return next(new AppError('Incorrect email or password', 401)); //unauthorized
    //attacker wont know which is wrong
  }

  createSendToken(user, 200, res);

  // // if yes send token
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});

exports.logout = (req, res) => {
  //we created and sent a token as a cookie when user loggedin. what we want for logout we send another token as a cokkie but this token will be invalid. the token with the same name will override existing legit token and user will be logged out.
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    //then token expires in 10sec and disappears
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  //1- get token and check if it exist

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
    token = req.cookies.jwt;
    //if there is no token in header then use cookies and use it as a token
  }

  // console.log(token);
  if (!token) {
    return next(new AppError('You are not logged in', 401)); //unauthorized
  }

  //2-veritication of token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  //3- check  if user exists, maybe user is deleted or changed its password

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('User blonging tto this token does not exist', 401)
    );
  }

  //4- check if user changed password after token was issued

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    //iat = issued at
    return next(
      new AppError('User recently changed password, login again', 401)
    );
  }
  //if all upper ones are ok then next to middleware(route)
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// only for rendered pages, no errors
exports.isLoggedIn = async (req, res, next) => {
  //1- get token and check if it exist
  if (req.cookies.jwt) {
    //there wasa catchAsync function here but it would cause error when logged out when jwt.verify. so we created try-catch block locally for this function and in case of faiuler we simply go next()
    try {
      // 1 - verify token

      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //2- check  if user exists, maybe user is deleted or changed its password

      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }

      //3- check if user changed password after token was issued

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      //if all upper ones are ok then there is a user logged in
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
  //if there is no token then is now logged in user and we move to next middleware
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles [admin, lead-guide]
    if (!roles.includes(req.user.role)) {
      //req.user.role comes from previous middleware which is authController.protect (current user)
      return next(
        new AppError('You do not have permission to perform this action', 403)
      ); //403 forbidden
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //get user based on POSTed email

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with this email', 404));
    //not found code
  }

  //generate reset token

  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });
  //since we dont have any value it will give tons of error if not with validate:false

  //send it to users email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot you password? Submit a patch req with new password and comfirm to ${resetURL}.\n If you this is not you, ignore this message`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'You password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpries = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error seding email. Try again later', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1 -get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpries: { $gt: Date.now() },
    //second one check if its expired or not. if yes it wont return a user and throws the error down here
  });

  // 2- set new password; if token has not expired and there is a user

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpries = undefined;
  await user.save();
  //we use save() cuz we want all validators run

  //3-update changedPasswordAt property for the user

  // //log user in, send JWT

  createSendToken(user, 200, res);
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1 - get user from collection
  const user = await User.findById(req.user.id).select('+password');
  console.log(user);

  // 2 - check if posted password is correct

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is not correct', 401));
  }

  // 3- update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  // 4- Log user in again (send JWT)

  createSendToken(user, 200, res);
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});
