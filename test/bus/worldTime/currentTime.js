({
  parameters: {
    area: 'string',
    location: 'string',
  },

  method: {
    get: 'timezone',
    path: ['area', 'location'],
  },

  returns: {
    abbreviation: 'string',
    client_ip: 'string',
    datetime: 'string',
    day_of_week: 'number',
    day_of_year: 'number',
    dst: 'boolean',
    dst_from: 'string',
    dst_offset: 'number',
    dst_until: 'string',
    raw_offset: 'number',
    timezone: 'string',
    unixtime: 'number',
    utc_datetime: 'string',
    utc_offset: 'string',
    week_number: 'number',
  },
});
