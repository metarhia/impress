() => ({
  ...api.globalstorage.schemaConfig,
  additionalSchemas: [
    api.path.resolve(
      api.path.dirname(api.registry.getModuleMainPath('globalstorage')),
      'schemas',
      'system'
    ),
  ],
});
