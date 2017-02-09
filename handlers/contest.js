var fs = require('fs'),
    formidable = require('formidable'),
    path = require('path');

//создаем каталог для хранения загруженных файлов
var dataDir = path.normalize(path.join(__dirname, '..', '/data'));
var vacationPhotoDir = path.join(dataDir, '/vacation-photo');
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

exports.vacationPhoto = function(req, res) {
  var now = new Date();
  res.render('contest/vacation-photo', {
    year: now.getFullYear(),
    month: now.getMonth()
  });
};

function saveContestEntry(contestName, email, year, month, photoPath) {
  //TODO
}

exports.vacationPhotoProcessPost = function(req, res) {
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
};

exports.vacationPhotoEntries = function(req, res){
  res.render('contest/vacation-photo/entries');
};