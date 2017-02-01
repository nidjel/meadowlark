suite('Тесты страницы О...', function() {
  test('страница должна содержать ссылку на страницу контактов', function() {
    assert(document.querySelector('a[href="/contact"]'));
  })
})