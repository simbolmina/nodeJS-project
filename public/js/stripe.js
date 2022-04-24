import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async (tourId) => {
  try {
    const stripe = Stripe(
      'pk_test_51Ks2MeBvEMVy1zPIHj2fVXQSrk7HqcW8Ba1N5uPkhWmI1WaGciiC0kE6xdWIRG0E6d2Ba2GGFxCCX2Iy8BovS9K700Fy7gh1wj'
    );
    //1 - get checkout session from API

    const session = await axios(
      `http://localhost:3000/api/v1/booking/checkout-session/${tourId}`
    );
    console.log(session);
    //2- Create checkout form + charge card

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

// export const bookTour = async (tourId) => {
//   const stripe = Stripe(
//     'pk_test_51Ks2MeBvEMVy1zPIHj2fVXQSrk7HqcW8Ba1N5uPkhWmI1WaGciiC0kE6xdWIRG0E6d2Ba2GGFxCCX2Iy8BovS9K700Fy7gh1wj'
//   ); // <==== PUT THE VARIABLE HERE

//   try {
//     // 1. Get checkout session from the API
//     const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
//     console.log(session);

//     // 2. Create checkout form + charge credit card
//     await stripe.redirectToCheckout({
//       sessionId: session.data.session.id,
//     });
//   } catch (err) {
//     console.log(err);
//     showAlert('error', err);
//   }
// };
