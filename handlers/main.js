var fortune = require('../lib/fortune.js'),
    formidable = require('formidable'),
    NewsletterSignup = require('../models/newsLetterSignup');

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

var VALID_EMAIL_REGEX = /^[-\w.]+@([A-z0-9][-A-z0-9]+\.)+[A-z]{2,4}$/;

exports.newsletterProcessPost = function(req, res) {
    //обработка формы в кодировке multipart/form-data (например, если отправили с помощью FormData)
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, fiels) {
      var name = fields.name || '', email = fields.email || '';
      if (err) {
        if (req.xhr) return res.json({error: 'Ошибка обработки формы сервером.'});
        req.session.flash = {
          type: 'danger',
          intro: 'Ошибка сервера!',
          message: 'Попробуйте еще раз.'
        };
        return res.redirect(303, '/newsletter');
      }
      if (!email.match(VALID_EMAIL_REGEX)) {
        if (req.xhr) return res.json({error: 'Некорректный адрес почты.'});
        req.session.flash = {
          type: 'danger',
          intro: 'Ошибка проверки!',
          message: 'Введенный адрес почты некорректен.'
        };
        return res.redirect(303, '/newsletter');
      }
       //добавление данных в б.д.
      new NewsletterSignup({name: name, email: email}).save(function(err) {
		if(err) {
          if(req.xhr) return res.json({error: 'Database error.'});
          req.session.flash = {
              type: 'danger',
              intro: 'Database error!',
              message: 'There was a database error; please try again later.',
          };
		}
        if (req.xhr || req.accepts('json,html') === 'json') return res.json({success: true});
        req.session.flash = {
          type: 'success',
          intro: 'Спасибо!',
          message: 'Вы были подписаны на информационный бюллетень!'
        };
        return res.redirect(303, '/thank-you');
      }); 
    });      
  };

