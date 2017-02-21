module.exports = {
  checkWaivers: function(req, res, next) {
    var cart = req.session.cart;
    if(!cart) return next();
    if(cart.items.some(function(item) {return item.vacation.requireWaiver;})) {
      if(!cart.warnings) cart.warnings = [];
      cart.warnings.push('Один или более выбранных вами туров требуют отказа от ответсвенности.');
    }
    next();
  },
  checkGuestCounts: function(req, res, next) {
    var cart = req.session.cart;
    if(!cart) return next();
    if(cart.items.some(function(item) {return item.guests > item.vacation.maximumGuests;})) {
      if(!cart.errors) cart.errors = [];
      cart.errors.push('В одном или более выбранных вами туров недостаточно мест для выбранного вами количества гостей.');
    }
    next();
  }
}