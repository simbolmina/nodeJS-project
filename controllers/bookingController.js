const stripe = require('stripe')(process.env.STRIPE_SKEY);
const Tour = require('./../models/tourModel');
const User = require('../models/userModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1 - get currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2- create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get('host')}/?tour=${
    //   req.params.tourId
    // }&user=${req.user.id}&price=${tour.price}`,

    success_url: `${req.protocol}://${req.get('host')}/?tours`,
    //costumer will be redirected main page after paymet
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    //if costumer cancel paymet it will be redirected to last tour page
    customer_email: req.user.email,
    //this is a protected route so user is already at request
    //to create a new booking in our databese, we need this custom option
    client_reference_id: req.params.tourId,
    //info about the item has ben purchased
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        //   images: [`https://www.natours.dev/img/tours/${tour.imageCover}.jpg`]
        images: [
          `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
        ],
        amount: tour.price * 100, //amount is expected in cents
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // 3- session as response to client
  res.status(200).json({
    status: 'success',
    session,
  });
});

// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   const { tour, user, price } = req.query;
//   if (!tour && !user && !price) return next();
//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split('?')[0]);
//   //we are testing our apis on local server but strip wont work. so we pass info from url. since its not secure we redirect user to original page so they wont see info on url. this is temperory solution.
// });

const createBookingCheckout = async (session) => {
  //we are getting these info from getCheckoutSession function and session variable.
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.display_items[0].amount / 100;

  await Booking.create({ tour, user, price });
};

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  //when stripe request ours website it will add a header as signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`webhook error: ${err.meesage}`);
  }

  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
