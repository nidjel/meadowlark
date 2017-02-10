var mongoose = require('mongoose');

var newsLetterSignupSchema = mongoose.Schema({
  name: String,
  email: String
});

var newsLetterSignup = mongoose.model('newsLetterSignup', newsLetterSignupSchema);

module.exports = newsLetterSignup;