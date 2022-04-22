const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cant be empty'],
      trim: true,
      //   maxlength: [41, 'Review must be under 40 char'],
      //   minlength: [10, 'Review must be more than 9 char'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be above 1'],
      max: [5, 'Rating must be belowe 5.1'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must belong to a user'],
    },
  },
  {
    //when we have a property to show but not save it in database we need these options. these are for calculated outputs
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//each user can review a tour only once and can only update or delete this review instead of adding multiple reviews. we cant make reviews unique otherwise each tour can only be reviewed once and a user can review a tour just once. to solve this problem we will use a compound index.
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
//with this each combination user and a tour is now unique/

// reviewSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'tour -guides',
//     select: 'name',
//   });
//   this.populate({
//     path: 'user',
//     select: 'name ',
//   });
//   next();
// });

//we unpopulated 'tour' here because tour and reviews were in indefinite nested situation

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// this is a static method. we created this in order to calculate tour ratings avarage based on reviews. when user add or remove a review avarage rating will change
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    //we select current tour by tourId and modify which parts of it we want to manipulate. this is a aggragation pipeline.
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);

  //in order to manipulate tour ratings based on user review we calculate them. this includes deletion as well. but what if only revies gets deleted? so this if else statement is for this solution.
  if (stats.length > 0) {
    //after calculation we saved calculated statistic to current tour
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAvarage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAvarage: 4.5,
    });
  }
};

//we call this after new review has been created.
reviewSchema.post('save', function () {
  //this points to current review
  this.constructor.calcAverageRatings(this.tour);
  //this.constructor is currrent model
  // Review.calcAverageRatings(this.tour)
  //but since Review is not available atm we use constructor.
});

//findByIdAndUpdate and findByIdAndDelete hooks are only available for query middlewares but not document middlewares. Thats why accesing existing documents, extractiong document id and updating avarage rating is not possible with these. we used post last time for this. thats why we use a workaround.

reviewSchema.pre(/^findOneAnd/, async function (next) {
  //this keyword is current query. we will execute current query and it will give us currnt document. r is current document (review)
  this.r = await this.findOne();
  //we extracted document id (tour id) then store it to this.r to be able use it at the post middleware (below) in order to calculate avarage rating.
  // console.log(this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
