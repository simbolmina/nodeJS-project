const crypto = require('crypto'); //builtin module
const mongoose = require('mongoose');
const validator = require('validator'); //this is 3rd party package
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User must have a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'User must have a email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please enter a valid email'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Enter a password'],
    minlength: 8,
    select: false, //this way we wont send password to client
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Confirm your password'],
    validate: {
      //this works only on CREATE/SAVE. we can UPDATE password and this wont work
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date, //user who has not changed their password wont have this property
  passwordResetToken: String,
  passwordResetExpries: Date,
  active: {
    //all user are active upon creation.
    type: Boolean,
    default: true,
    select: false, //we dont show this schema property
  },
});

userSchema.pre('save', async function (next) {
  //only run if password was actually modified
  if (!this.isModified('password')) return next();

  //hash the password
  this.password = await bcrypt.hash(this.password, 12);
  //delete this data
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function (next) {
  //this function runs before save() function so checkes if password is modified or newly created. so we issue a timestamp for future password changes
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  // -1000ms is to ensure timestamp is before tokens issue time
  next();
});

userSchema.pre(/^find/, function (next) {
  //query middleware that will work every request starts with find and wont show user with active: false property
  this.find({ active: { $ne: false } });
  //we wanted use {active: true} so only true would show but some user dont have this model/property. so it now not equal to false
  next();
});

//return true if passwords are the same when user login
//this is a instance method and awailable for all of application. we dont need to export it. it will be attached with document
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // console.log(this.passwordChangedAt, changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  //randomly generate 32char token and convert it hexadecimal string
  //we dont have to use a strong crypto token. thats enough
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpries = Date.now() + 10 * 60 * 1000; // (10 minutes)

  return resetToken; //will be sent via email
};

const User = mongoose.model('User', userSchema);

module.exports = User;
