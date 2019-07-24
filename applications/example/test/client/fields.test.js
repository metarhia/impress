test.endAfterSubtests();

test.test('content-type multipart/form-data', test => {
  const form = {
    fields: { parameter: ['value1', 'value2'] },
    options: { path: '/clientTest/fields.json', boundary: 'boundaryValue' },
  };

  api.clientTest.sendFormData(form, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    const { fields } = api.json.parse(data);
    test.strictSame(fields, form.fields);
    test.end();
  }));
});

test.test('content-type application/json', test => {
  const expectedFields = { parameter: 'value' };
  const body = api.json.stringify(expectedFields);
  const request = {
    method: 'POST',
    path: '/clientTest/fields.json',
    headers: { 'Content-Type': 'application/json' },
  };

  api.clientTest.request(request, body, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    const { fields } = api.json.parse(data);
    test.strictSame(fields, expectedFields);
    test.end();
  }));
});

test.test('query string', test => {
  const expectedFields = { parameter: ['value1', 'value2'] };
  const query = api.querystring.stringify(expectedFields);
  const request = { method: 'POST', path: '/clientTest/fields.json' };

  api.clientTest.request(request, query, test.cbFail((res, data) => {
    test.strictSame(res.statusCode, 200);
    const { fields } = api.json.parse(data);
    test.strictSame(fields, expectedFields);
    test.end();
  }));
});
