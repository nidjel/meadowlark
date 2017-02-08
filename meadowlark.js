var express = require('express');
var app = express();

var formidable = require('formidable');

var fs = require('fs');

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

var credentials = require('./credentials.js');

var Vacation = require('./models/vacation.js');

//database configuration
var mongoose = require('mongoose');
var options = {
    server: {
       socketOptions: { keepAlive: 1 } 
    }
};
switch (app.get('env')) {
  case 'development':
    mongoose.connect(credentials.mongo.development.connectionString, options);
    break;
  case 'production':
    mongoose.connect(credentials.mongo.production.connectionString, options);
    break;
  default:
    throw new Error('Unknown execution environment: ' + app.get('env'));
}

// initialize vacations
Vacation.find(function(err, vacations) {
  if (err) return console.error(err);
  if (vacations.length) return;
  
  new Vacation({
    name: 'Hood River Day Trip',
    slug: 'hood-river-day-trip',
    category: 'Day Trip',
    sku: 'HR199',
    description: 'Spend a day sailing on the Columbia and ' + 
        'enjoying craft beers in Hood River!',
    priceInCents: 9995,
    tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
    inSeason: true,
    maximumGuests: 16,
    available: true,
    packagesSold: 0,
  }).save();

  new Vacation({
    name: 'Oregon Coast Getaway',
    slug: 'oregon-coast-getaway',
    category: 'Weekend Getaway',
    sku: 'OC39',
    description: 'Enjoy the ocean air and quaint coastal towns!',
    priceInCents: 269995,
    tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
    inSeason: false,
    maximumGuests: 8,
    available: true,
    packagesSold: 0,
  }).save();

  new Vacation({
    name: 'Rock Climbing in Bend',
    slug: 'rock-climbing-in-bend',
    category: 'Adventure',
    sku: 'B99',
    description: 'Experience the thrill of rock climbing in the high desert.',
    priceInCents: 289995,
    tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing', 'hiking', 'skiing'],
    inSeason: true,
    requiresWaiver: true,
    maximumGuests: 4,
    available: false,
    packagesSold: 0,
    notes: 'The tour guide is currently recovering from a skiing accident.',
  }).save();
});

var fortune = require('./lib/fortune.js');

var VALID_EMAIL_REGEX = new RegExp('/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/');

app.disable('x-powered-by');

app.set('port', process.env.PORT || 3000);

app.use(express.static(__dirname + '/public'));

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
  resave: false,
  saveUninitialized: false,
  secret: credentials.cookieSecret
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

//журналирование (логирование - logging)
switch(app.get('env')) {
  case 'development':
    //сжатое многоцветное журналирование для разработки
    app.use(require('morgan')('dev'));
    break;
  case 'production': 
    //модуль express-logger поддерживает ежедневное чередование файлов журналов
    app.use(require('express-logger')({
      path:__dirname + '/log/requests.log'
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
    year: now.getFullYear(),
    month: now.getMonth()
  });
});

//создаем каталог для хранения загруженных файлов
var dataDir = __dirname + '/data';
var vacationPhotoDir = dataDir + '/vacation-photo';
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

function saveContestEntry(contestName, email, year, month, photoPath) {
  
}

app.post('/contest/vacation-photo/:year/:month', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    if (err) {
      req.session.flash = {
        type: 'danger',
        intro: 'Упс!',
        message: 'Во время обработки отправленной Вами формы произошла ошибка. Попробуйте еще раз.'
      };
      return res.redirect(303, '/contest/vaction-photo');
    }
    var photo = files.photo;
    var dir = vacationPhotoDir + '/' + Date.now();
    var path = dir + '/' + photo.name;
    fs.mkdirSync(dir);
    fs.renameSync(photo.path, path);
    saveContestEntry('vacation-photo', fields.email, req.params.year, req.params.month, path);
    req.session.flash = {
      type: 'success',
      intro: 'Удачи!',
      message: 'Вы стали участником конкурса.'
    };
    res.redirect(303, '/contest/vaction-photo/entries');
  });
});

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

app.get('/vacations',  function(req, res) {
  Vacation.find({available: true}, function(err, vacations) {
    var context = {
      vacations: vacations.map(function(vacation) {
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          price: vacation.getDisplayPrice(),
          inSeason: vacation.inSeason
        }
      })
    };
    res.render('vacations', context);
  });
});

app.get('/cart/add', function(req, res) {
  var cart = req.session.cart || (req.session.cart = {items: []});
  Vacation.findOne({sku: req.query.sku}, function(err, vacation) {
    if (err) return next(err);
    if (!vacation) return next(new Error('Нет тура с таким sku' + req.query.sku));
    cart.items.push({
      vacation: vacation,
      guests: req.query.guests || 1
    });
    vacation.packagesSold++;
    vacation.save();
    res.redirect(303, '/cart');
  });
});

app.get('/cart', function(req, res) {
  var cart = req.session.cart;
  if (!cart) next();
  res.render('cart', {cart: cart});
});

app.get('/cart/checkout', function(req, res) {
  var cart = req.session.cart;
  if (!cart) next();
  res.render('cart-checkout');
});

app.post('/cart/checkout', function(req, res) {
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
