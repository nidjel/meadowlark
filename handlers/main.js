var fortune = require('../lib/fortune.js');

exports.home = function(req, res) {
  res.render('home');
};

exports.about = function(req, res) {
  res.render('about', {
    fortune: fortune.getFortune(),
    pageTestScript: '/qa/tests-about.js'
  });
};

exports.newsletter = function(req, res) {
  res.render('newsletter', {csrf: 'CSRF token goes here'});
};

var VALID_EMAIL_REGEX = new RegExp('/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/');

exports.newsletterProcessPost = function(req, res) {
    //если оправили форму стандартным способом html
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      console.log(req.body);

      req.session.flash = {
        type: 'success',
        intro: 'Спасибо!',
        message: 'Вы были подписаны на информационный бюллетень.'
      };
      return res.redirect(303, '/thank-you');
    }

      //обработка формы в кодировке multipart/form-data (например с помощью FormData)
      var form = new formidable.IncomingForm();

      form.parse(req, function(err, fields, fiels) {
        if (err) {
          if (req.xhr) {
            return res.json({error: 'Ошибка обработки.'});
          }
          req.session.flash = {
            type: 'danger',
            intro: 'Ошибка сервера!',
            message: 'Попробуйте еще раз.'
          };
          return res.redirect(303, '/error');
        }

        if (!fields.email.match(VALID_EMAIL_REGEX)) {
          if (req.xhr) {
             return res.json({error: 'Некорректный адрес почты.'});
          }
          req.session.flash = {
            type: 'danger',
            intro: 'Ошибка проверки!',
            message: 'Введенный адрес почты некорректен.'
          };
          return res.redirect(303, '/thank-you');
        }

        if (req.xhr || req.accepts('json,html') === 'json') {
          res.send({success: true});
        } else {
          req.session.flash = {
            type: 'success',
            intro: 'Спасибо!',
            message: 'Вы были подписаны на информационный бюллетень!'
          };
          return res.redirect(303, '/thank-you');
        }
      });
  //TODO добавление данных в б.д.
  };

