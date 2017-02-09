exports.nurseryRhymeData = function(req, res) {
  res.json({ //данные для клиентской шаблонизации
      animal: 'василиск',
      bodyPart: 'хвост',
      adjective: 'острый',
      noun: 'иголка'
  });
};