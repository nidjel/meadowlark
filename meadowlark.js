var express = require('express'),
    cartValidation = require('./lib/cartValidation.js'),
    credentials = require('./credentials.js'),
    formidable = require('formidable'),
    fortune = require('./lib/fortune.js'),
    fs = require('fs'),
    Vacation = require('./models/vacation.js'),
    VacationInSeasonListener = require('./models/vacationInSeasonListener.js');

var app = express();
app.disable('x-powered-by');

// set up handlebars view engine
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

app.set('port', process.env.PORT || 3000);

app.use('/api', require('cors')());//для межсайтовых запросов

//logging
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

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
  resave: false,
  saveUninitialized: false,
  secret: credentials.cookieSecret
}));
app.use(require('body-parser').urlencoded({extended: true})); //для обработки req.body при post запросах
app.use(express.static(__dirname + '/public'));
/*app.use(require('csurf')());//для защиты от CSRF атак
app.use(function(req, res, next) {
  res.locals._csrfToken = req.csrfToken();
  next();
});*/

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

// flash message middleware
app.use(function(req, res, next) {
  //если имеется экстренное сообщение, переместим его в контекст, а затем удалим
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// set 'showTests' context property if the querystring contains test=1
app.use(function(req, res, next) {
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  next();
});

// mocked weather data; нужно подключение к внешнему api
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

// middleware to add weather data to context
app.use(function(req, res, next) {
  if (!res.locals.partials) res.locals.partials = {};
  res.locals.partials.weatherContext = getWeatherData();
  next();
});

//создаем поддомен admin 
var admin = express.Router();
app.use(require('vhost')('admin.*', admin));

admin.get('/', function(req, res) {
  res.render('admin/home');
});

//cart validation
app.use(cartValidation.checkWaivers);
app.use(cartValidation.checkGuestCounts);

// add routes
require('./routes.js')(app);


//API
var Attraction = require('./models/attraction.js');

//извлекает достопримечательности
app.get('/api/attractions', function(req, res) {
  Attraction.find({approved: true}, function(err, attractions) {
    if (err) return res.status(500).send('Произошла ошибка: ошибка базы данных.');
    res.json(attractions.map(function(a) {
              return {
                name: a.name,
                id: a._id,
                description: a.description,
                location: a.location
               };
             })
    );
  });
});

//добавляет достопримечательность в очередь на модерацию
app.post('api/attraction', function(req, res) {
  var a = new Attraction({
    name: req.body.name,
    description: req.body.description,
    location: {lat: req.body.lat, lng: req.body.lng},
    history: {
      event: 'created',
      email: req.body.email,
      date: new Date()
    },
    approved: false
  });
  a.save(function(err, a) {
    if (err) return res.status(500).send('Произошла ошибка: ошибка базы данных.');
    res.json({id: a._id});
  })
});

//возвращает достопримечательность по id
app.get('/api/attraction/:id', function(req, res) {
  Attraction.findById(req.params.id, function(err, a) {
    if (err) return res.status(500).send('Произошла ошибка: ошибка базы данных.');
    res.json({
      name: a.name,
      id: a._id,
      description: a.description,
      location: a.location
    });
  });
});

//обновляет существующую достопримечательность
app.put('/api/attration:id', function(req, res) {
  //...
});

//удаляет достопримечательность
app.delete('api/attraction:id', function(req, res) {
  //...
});

// add support for auto views
var autoViews = {};
app.use(function(req, res, next) {
  var path = req.path.toLowerCase();
  //проверка кэша
  if (autoViews[path]) return res.render(autoViews[path]);
  //проверяем наличие подходящего файла .handlebars
  if (fs.existsSync(__dirname + '/views' + path + '.handlebars')) {
    autoViews[path] = path.replace(/^\//, '');
    return res.render(autoViews[path]);
  }
  next();//представление не найдено
});

// 404 catch-all handler (middleware)
app.use(function(req, res) {
  res.status(404);
  res.render('404');
});

// 500 error handler (middleware)
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function() {
  console.log('Express is running on ' + app.get('port') + ' В режиме: ' + app.get('env'));
});
