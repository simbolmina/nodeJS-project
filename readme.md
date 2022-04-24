# Natours Application from my udemy course.

Created with nodeJS, express, mongoDB, mongoose and used mapbox, stripe apis. Maps and stripte currently not working because of some of hosting adddress and CORS problems. Front-end made with pug and will be created again using ReactJS.

Features will be added:

business logic - api side
1- add restriction that user can only review tours they are booked
2- nested booking routes. like all and for invidual user
3- imporove tour dates. if certean tour reaches maxGroup size\ suggest another date to new user who wants to buy that tour. participant count should not booked ones.
4-confirm user mail address, add refresh token feature and two-factor auth

website
1- signup page
2- add review option for user who booked / participated tour
3- add "like tour" function for all user
4- hide booking section from tour page from user who are already booked or add a message as book again
5- add 'my reviews' page and user can edit there
6- for admins, create a manage page. they can create, read, update, delete tours, users, reviews and bookings.
