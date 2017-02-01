var fortunes = [
  "rest", "fest", "next"
];

exports.getFortune = function() {
  var idx = Math.floor(Math.random() * fortunes.length);
  return fortunes[idx];
}