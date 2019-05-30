async () => (
  // deref loading of system schemas until the tests are ready
  // to avoid impress worker crashing due to invalid schemas
  !api.test.useSystemSchemas ?
    api.globalstorage.schemaConfig :
    api.metaschema.fs.applySystemConfig(
      api.path.join(application.dir, 'validationSchemas'),
      api.metaschema.default,
      api.globalstorage.schemaConfig
    )
);
