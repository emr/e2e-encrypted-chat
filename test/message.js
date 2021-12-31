const Message = require('../message');
const User = require('../user');

(() => {
  console.log('Testing event message format');
  const date = new Date();
  const message = new Message('user1 joined', undefined, date, true);
  const expected = `{"msg":"user1 joined","date":"${date.toISOString()}","isEvent":true}`;
  const result = message.toWsMessage();
  console.assert(expected === result, 'Failed', { expected, result });
})();

(() => {
  console.log('Testing user message format');
  const date = new Date();
  const user = new User('2', undefined);
  const message = new Message('hello', user, date);
  const expected = `{"msg":"hello","from":"2","date":"${date.toISOString()}"}`;
  const result = message.toWsMessage();
  console.assert(expected === result, 'Failed', { expected, result });
})();

(() => {
  console.log('Testing file message format');
  const date = new Date();
  const user = new User('3', undefined);
  const message = new Message('filecontent', user, date, undefined, true);
  const expected = `{"msg":"filecontent","from":"3","date":"${date.toISOString()}","isFile":true}`;
  const result = message.toWsMessage();
  console.assert(expected === result, 'Failed', { expected, result });
})();

console.log('Test execution done');
