/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';

export const login = async (email, password) => {
  // console.log(email, password);
  try {
    const res = await axios({
      method: 'POST',
      // url: 'http://127.0.0.1:3000/api/v1/users/login',
      // url: 'http://localhost:3000/api/v1/users/login',
      url: '/api/v1/users/login',
      //deleting first part of the url is enough for it to work at deployment site (heroku) since api ve and website using same url
      data: {
        email,
        password,
      },
    });

    // console.log(res);

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

// const login = async ({ email, password }) => {
//   try {
//     const response = await fetch('http://127.0.0.1:3000/api/v1/users/login', {
//       method: 'POST',
//       headers: {
//         'content-type': 'application/json',
//       },
//       body: JSON.stringify({ email, password }),
//     });
//     if (!response.ok) throw response;
//     const data = await response.json();
//     console.log(data);
//   } catch (err) {
//     console.error(err);
//   }
// };

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      // url: 'http://127.0.0.1:3000/api/v1/users/logout',
      // url: 'http://localhost:3000/api/v1/users/logout',
      url: '/api/v1/users/logout',
    });
    //after logging out succcessfully we reload the page
    if ((res.data.status = 'success')) location.reload(true);
    //true will force the page from server, not the browser, otherwise browser might keep token and infos
  } catch (err) {
    console.log(err.response);
    showAlert('error', 'Error logging out! Try again');
  }
};
