var Vacation = require('../models/vacation.js'),
    vacationInSeasonListener = require('../models/vacationInSeasonListener.js');;

function convertFromUSD(value, currency) {
  switch(currency) {
    case 'USD': return value * 1;
    case 'GBP': return value * 0.6;
    case 'BTC': return value * 0.00237;
    default: return NaN;
  }
};

exports.list = function(req, res) {
  Vacation.find({available: true}, function(err, vacations) {
    var currency = req.session.currency || 'USD';
    var context = {
      currentcy: currency,
      vacations: vacations.map(function(vacation) {
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          price: convertFromUSD(vacation.priceInCents/100, currency),
          inSeason: vacation.inSeason
        };
      })
    };
    switch(currency) {
      case 'USD': context.currencyUSD = 'selected'; break;
      case 'GBP': context.currencyGBP = 'selected'; break;
      case 'BTC': context.currencyBTC = 'selected'; break;
    }
    res.render('vacations', context);
  });
};

exports.notifyMeWhenInSeasons = function(req, res) {
  res.render('notify-me-when-in-season', {sku: req.query.sku});
};

exports.notifyWhenInSeasonProcessPost = function(req, res) {
  vacationInSeasonListener.update(
    {email: req.body.email},
    {$push: {skus: req.body.sku}},
    {upsert: true},
    function(err) {
      if (err) {
        console.log(err.stack);
        req.session.flash = {
          type: 'danger',
          intro: 'Упс!',
          message: 'При обработке вашего запроса произошла ошибка'
        };
        return res.redirect(303, '/vacations');
      }
      req.session.flash = {
        type: 'success',
        intro: 'Спасибо!',
        message: 'Вы будете оповещены, когда наступит сезон для этого тура.'
      };
      return res.redirect(303, '/vacations');
    }
  )
};