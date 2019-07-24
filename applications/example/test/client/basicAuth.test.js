test.endAfterSubtests();

const auth = 'user:password';
const realm = 'Restricted area';

// commented due to https://github.com/metarhia/impress/issues/1189
//
// test.test('basic authentication scheme, unauthorized', test => {
//   const request = { method: 'GET', path: '/clientTest/basicAuth.json', auth };
//   api.clientTest.request(request, test.cbFail((res, data) => {
//     test.strictSame(res.statusCode, 200);
//     test.strictSame(api.json.parse(data), { auth, realm });
//     test.end();
//   }));
// });

test.test('basic authentication scheme, unauthorized', test => {
  const request = { method: 'GET', path: '/clientTest/basicAuth.json' };
  api.clientTest.request(request, test.cbFail(res => {
    test.strictSame(res.statusCode, 401);
    test.strictSame(res.headers['www-authenticate'], `Basic realm="${realm}"`);
    test.end();
  }));
});
