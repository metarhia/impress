({
  mode: { type: 'string', required: false },
  size: 'size',
  maxFileSize: 'size',
  streamThreshold: { type: 'size', required: false },
  virtualFS: { type: 'boolean', required: false },
  avoid: { array: 'string', required: false },
  placements: {
    array: {
      schema: {
        name: 'string',
        ext: { array: 'string', required: false },
      },
    },
    required: false,
  },
  sab: {
    schema: {
      limit: 'size',
      baseSegmentSize: 'size',
    },
    required: false,
  },
});
