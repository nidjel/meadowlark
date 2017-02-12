var Vacation = require('../models/vacation.js');

exports.home = function(req, res) {
  var cart = req.session.cart;
  if (!cart) next();
  res.render('cart', {cart: cart});
};

function addToCart(sku, guests, req, res, next) {
  var cart = req.session.cart || (req.session.cart = {items: []});
  
  Vacation.findOne({sku: sku}, function(err, vacation) {
    if (err) return next(err);
    if (!vacation) return next(new Error('Нет тура с таким sku' + sku));
    cart.items.push({
      vacation: vacation,
      guests: guests || 1
    });
    
    vacation.packagesSold++;//надо бы обновлять базу в момент продажи, а не добавления тура в корзину
    vacation.save();
    
    res.redirect(303, '/cart');
  });
};

exports.addProcessGet = function(req, res, next) {
  addToCart(req.query.sku, req.query.guests, req, res, next);
};

exports.checkout = function(req, res) {
  var cart = req.session.cart;
  if (!cart) next();
  res.render('cart-checkout');
};

exports.checkoutProcessPost = function(req, res) {
  var cart = req.session.cart;
  if (!cart) next(new Error('Cart does not exist.'));
  
  var name = req.body.name || '', email = req.body.email || '';
  // assign a random cart ID; normally we would use a database ID here
  cart.number = Math.random().toString().replace(/^0\.0*/, '');
  cart.billing = {
      name: name,
      email: email,
  };
  res.render('cart-thank-you', { cart: cart });
};

exports.setCurrency = function(req, res) {
  req.session.currency = req.params.currency;
  return res.redirect(303, '/vacations');
};