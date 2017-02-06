var express = require('express');
var app = express();

var formidable = require('formidable');

var handlebars = require('express-handlebars')
  .create({
    defaultLayout: 'main',
    helpers: {
      section: function(name, options) {
        if (!this._sections) this._sections = {};
        this._sections[name] = options.fn(this);
        return null;
      }
    }
  });

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

var credetials = require('./credentials.js');

var fortune = require('./lib/fortune.js');

var VALID_EMAIL_REGEX = new RegExp('/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/');

app.disable('x-powered-by');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));

app.use(require('cookie-parser')(credetials.cookieSecret));
app.use(require('express-session')({
  resave: false,
  saveUninitialized: false,
  secret: credetials.cookieSecret
}));

app.use(require('body-parser').urlencoded({extended: true})); //для обработки req.body при post запросах

app.use(function(req, res, next) { //установка глобального контекста для представлений
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  
  if (!res.locals.partials) res.locals.partials = {};
  res.locals.partials.weatherContext = getWeatherData();
  
  //если имеется экстренное сообщение, переместим его в контекст, а затем удалим
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  
  next();
});

//журналирование
switch(app.get('env')) {
  case 'development':
    //сжатое многоцветное журналирование для разработки
    app.use(require('morgan')('dev'));
    break;
  case 'production': 
    //модуль express-logger поддерживает ежедневное чередование файлов журналов
    app.use(require('express-logger')({
      path:__dirname + 'log/requests.log'
    }));
    break;
}

//маршрутизация
app.get('/', function(req, res) {
  res.render('home');
});

app.get('/about', function(req, res) {
  res.render('about', {
    fortune: fortune.getFortune(),
    pageTestScript: '/qa/tests-about.js'
  });
});

app.get('/thank-you', function(req, res) {
  res.render('thank-you');
});

app.get('/newsletter', function(req, res) {
  res.render('newsletter', {csrf: 'CSRF token goes here'});
});

app.post('/process', function(req, res) {
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
});

app.get('/contest/vacation-photo', function(req, res) {
  var now = new Date();
  res.render('contest/vacation-photo', {
   year: now.getFullYear(), month: now.getMonth() 
  });
});

app.post('/contest/vacation-photo/:year/:month', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, fiels) {
    if (err) return res.redirect(303, '/error');
    console.log('received fields:');
    console.log(fields);
    console.log('received fiels:');
    console.log(fiels);
    res.redirect(303, '/thank-you');
  })
})

app.get('/nursery-rhyme', function(req, res) {
  res.render('nursery-rhyme');
});

app.get('/data/nursery-rhyme', function(req, res) {
  res.json({ //данные для клиентской шаблонизации
      animal: 'василиск',
      bodyPart: 'хвост',
      adjective: 'острый',
      noun: 'иголка'
  });
});

app.use(function(req, res) {
  res.status(404);
  res.render('404');
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function() {
  console.log('Express is running on ' + app.get('port') + ' В режиме: ' + app.get('env'));
});

function getWeatherData() {
  return {
    locations: [
      {
        name: 'Портленд',
        forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
        weather: 'Сплошная облачность',
        temp: '54.1 F (12.3 C)'
      },
      {
        name: 'Бенд',
        forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
        weather: 'Малооблачно',
        temp: '55.0 F (12.8 C)'
      },
      {
        name: 'Манзанита',
        forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
        weather: 'Небольшой дождь',
        temp: '55.0 F (12.8 C)',
      }
    ]
  };
}
