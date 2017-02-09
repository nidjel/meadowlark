var main = require('./handlers/main.js'),
    vacations = require('./handlers/vacations.js'),
    contest = require('./handlers/contest.js'),
    cart = require('./handlers/cart.js'),
    samples = require('./handlers/samples.js');

module.exports = function(app) {
  
  // miscellaneous routes
  app.get('/', main.home);
  app.get('/about', main.about);
  app.get('/newsletter', main.newsletter);
  app.post('/newsletter', main.newsletterProcessPost);

  // contest routes
  app.get('/contest/vacation-photo', contest.vacationPhoto);
  app.post('/contest/vacation-photo/:year/:month', contest.vacationPhotoProcessPost);
  app.get('/contest/vacation-photo/entries', contest.vacationPhotoEntries);
  
  // vacation routes
  app.get('/vacations', vacations.list);
  app.get('/notify-me-when-in-season', vacations.notifyMeWhenInSeasons);
  app.post('/notify-me-when-in-season', vacations.notifyWhenInSeasonProcessPost);
  
  // shopping cart routes
  app.get('/cart', cart.home);
  app.get('/cart/add', cart.addProcessGet);
  app.get('/cart/checkout', cart.checkout);
  app.post('/cart/checkout', cart.checkoutProcessPost);
  app.get('/set-currency/:currency', cart.setCurrency);
  
    // testing/sample routes
  app.get('/data/nursery-rhyme', samples.nurseryRhymeData);
};
