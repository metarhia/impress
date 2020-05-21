({
  caption: 'Create person with address',

  description: 'Store person and address to database with relation',

  examples: [
    {
      parameters: {
        person: { name: 'Marcus', surname: 'Aurelius', born: 121 },
        address: { country: 'Pax Romana', city: 'Roma' },
      },
      returns: { id: 10792532194309 },
    },
    {
      parameters: {
        person: { name: 'Antoninus', surname: 'Pius', born: 138 },
        address: { country: 'Pax Romana', city: 'Roma' },
      },
      returns: { id: 10792532194308 },
    },
  ],

  example: {
    parameters: {
      person: { name: 'Marcus', surname: 'Aurelius', born: 121 },
      address: { country: 'Pax Romana', city: 'Roma' },
    },
    returns: { id: 10792532194309 },
  },

  parameters: {
    person: { domain: 'Person' },
    address: { domain: 'Address' },
  },

  method: async ({ person, address }) => {
    const addressId = await api.gs.create(address);
    person.address = addressId;
    const personId = await api.gs.create(person);
    return personId;
  },

  returns: { type: 'number' },

  errors: {
    contract: 'Invalid arguments',
    fail: 'Person and address can not be saved to database',
    result: 'Invalid result',
  },
});
