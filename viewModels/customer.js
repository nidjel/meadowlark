//функция для присоединения полей
function smartJoin(arr, separator) {
 if (!separator) separator = ' ';
  return arr.filter(function(elem) {
    return elem !== undefined && elem !== null && elem.toString().trim() !== '';
  }).join(separator);
}

var _ = require('underscore'); //JavaScript-библиотека

//получаем модель представления покупателя
function getCustomerViewModel(customer, orders) {
  var vm = _.omit(customer, 'salesNotes') //возвращает копию объекта без указанных ключей
  return _.extend(vm, { //скопирует все свойства из объектов в объект первого параметра
    name: smartJoin([vm.firstName, vm.lastName]),
      fullAddress: smartJoin([
        customer.address1,
        customer.address2,
        customer.city + ', ' + 
          customer.state + ' ' + 
          customer.zip,
      ], '<br>'),
    orders: orders.map(function(order) {
      return {
        orderNumber: order.orderNumber,
        date: order.date,
        status: order.status,
        url: '/orders/' + order.orderNumber,
      };
    }),
  });
}

module.exports = getCustomerViewModel;