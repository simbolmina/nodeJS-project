const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

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

//in profile picture we used upload.single() but here its upload.fields()
//then an object with field name and max image count.
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

//if we did not have two seperate field for field but one field with multiple images we would do like this.
// exports.uploadTourImages = upload.array('images', 5)

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);

  if (!req.files.imageCover || !req.files.images) return next();

  //1-cover image

  req.body.imageCover = `tours-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) //resize to 500x500px
    .toFormat('jpeg') // format should be jpeg
    .jpeg({ quality: 90 }) // compress it to %90
    .toFile(`public/img/tours/${req.body.imageCover}`); //write photo this folder after resizing.

  //2-images
  req.body.images = [];
  //there are 3 images in an array for images in tourSchema. we create an empty array and push each image into array after resizing. we have use map method with Promise.all() instead of forEach becuase map creates a promise or else next() would run before this process finishes

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tours-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333) //resize to 500x500px
        .toFormat('jpeg') // format should be jpeg
        .jpeg({ quality: 90 }) // compress it to %90
        .toFile(`public/img/tours/${filename}`); //write photo this folder after resizing.

      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
// exports.getAllTours = catchAsync(async (req, res, next) => {
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .pagination();
//   const tours = await features.query;

//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours,
//     },
//   });
// });

exports.getTour = factory.getOne(Tour, { path: 'reviews' });
// exports.getTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findById(req.params.id).populate('reviews');
//   // .populate({ //we moved this to model as a middleware to use for all req.
//   //   path: 'guides',
//   //   select: '-__v -passwordChangedAt',
//   // });
//   //a tour contains guide list and we want to populate those guides we have reference in our database. we can also exludes what we dont want to populate with select option. if not just populate('guides')  is enough
//   //using populate creates new querries so dont use it too much

//   if (!tour) {
//     return next(new AppError('No tour found with this ID', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

exports.createTour = factory.createOne(Tour);

// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true, //we want this func to returen new doc
//     runValidators: true,
//   });

//   if (!tour) {
//     return next(new AppError('No tour found with this ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour,
//     },
//   });
// });

exports.updateTour = factory.updateOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with this ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });
exports.deleteTour = factory.deleteOne(Tour);
//we created a generic delete function and passed here instead of upper code

/// PIPELINE ///

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    //aggregate is to get statics of db objects
    {
      $match: { ratingsAvarage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, //to group fields
        numTours: { $sum: 1 }, //for each tour 1 will be added
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAvarage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0, // 1 is show, 0 is hide parameter
      },
    },
    {
      $sort: {
        numTourStarts: -1, // 1 us ascebdubg -1 us descebdubg
      },
    },
    {
      $limit: 12, //limit output document count
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// router.route('/tours-within/:distance/center/:latlng/unit/:unit',
// /tours-distance?distance=223&center=-40,33&unit=mi = this is another way
// /tours-within/233/center/-40/unit/mi - this is what we do.

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distnce / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }

  // console.log(distance, lat, lng, unit);

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

//get distances to tour from a point
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.0006211371 : 0.001;
  //we want distance in mile/km so we divide to 0.00621 or 0.001

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1], // * 1 is to convert them num
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        //we keep which results we want in pipeline and leave other fields with $project
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
