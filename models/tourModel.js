const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      //we can have additional options and error messages if not used
      unique: true, //uniuqe creates an index on mongoDB
      trim: true,
      maxlength: [41, 'Tour name must be under 40 char'],
      minlength: [10, 'Tour name must be more than 9 char'],
      // validate: [validator.isAlpha, ['name must contain only letters']],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        //validators only for strings
        values: ['easy', 'medium', 'difficult'], //can only be these 3
        message: 'Difficulies must be easy, medium or difficult',
      },
    },
    ratingsAvarage: {
      type: Number,
      default: 4.5,
      //user wont give rating when crate this. it will be calculated later
      min: [1, 'Rating must be above 1'],
      max: [5, 'Rating must be belowe 5.1'],
      //min-max works for dates as well
      //this is a setter funtion.
      set: (val) => Math.round(val * 10) / 10,
      // if avg is 3.666 and we want it as 3.6 we * 3.666 with 10 (36.66) then round it (=37) (otherwise it will be 5) then / with 10 (3.7)
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (value) {
          //this kw (which points current doc) wont be working with update functions
          return value < this.price;
        },
        message: `Discount must be lower than price ({VALUE})`,
      },
    },
    summary: {
      type: String,
      trim: true, //just for string, remove whitespaces
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String, //name of the image-a reference
      required: [true, 'A tour must have a image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(), //mongo will convert this auto
      select: false, //disable this to send back in response
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON refers to geo special data.
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'], // we speciafy paremeter only take this type of data we declare here. starting point should be 'Point'
      },
      coordinates: [Number], //we expect an array of numbers
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // guides: Array, //guides embedded
    guides: [
      //guides, reference
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    //schema options
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// tourSchema.index({ price: 1 });
//in order to perform search/filter fast we create index. 1 is ascending, -1 descending order.
tourSchema.index({ price: 1, ratingsAvarage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  //this data we want to show but not store cuz we can get or calculate within schema. this is not part of query, so we cant call it.
  return this.duration / 7;
  //we use regualr function to get access this keyword which points current document
});

//populating parent references via virtual
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', //name of the field on reviewSchema
  localField: '_id',
});

// document widdlewares - runs ONLY before .save() and .crate() //

tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
  //we can ommit using next if we use only 1 middleware but it shoult be here to get to next middle, or it wont work, will stuck in this function.
});

// tourSchema.pre('save', function (next) {
//   //aslso called presave middlewares
//   console.log('will save document...');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// EMBEDDING USERS TO TOURS
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   //guidesPromises will be an array of promises cuz of map and we use Promise.all to convert them to json
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

/// Query Middleware

tourSchema.pre(/^find/, function (next) {
  // tourSchema.pre('find', function (next) {
  //its same as document middleware but its use find() method and this refers to query (which is link). it works with find() but not with findOne();
  //so we use /^find/ regular expression which lets us use this middleware with every command with starting find. (findbyId, findandupdate etc)
  this.find({ secretTour: { $ne: true } });
  //we get all tours without secretTour kw true, so it wont be listed. its like we want these tours for vips etc
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  //populate reference guides into document and exluding v and pass
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`querry took ${Date.now() - this.start} ms`);
  // console.log(docs);
  next();
});

//Aggregation Middleware

// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // we filter out our secretTour at pipelilne so it will be filteredout for all aggregations;
//   // console.log(this.pipeline()); //this is current agg object
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
