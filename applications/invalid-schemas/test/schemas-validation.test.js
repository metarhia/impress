const { ValidationError, MetaschemaError } = api.metaschema.errors;

api.test.useSystemSchemas = true;
application.loadSchemas(error => {
  test.strictSame(
    error,
    new MetaschemaError([
      new ValidationError(
        'notAllowedAdditionalProp',
        'CategoryName.CustomNomen',
        {
          allowed: ['CategoryField']
        }
      ),
    ]),
  );

  test.end();
});
