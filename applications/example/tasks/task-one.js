({
  caption: 'Task One',
  execute: 'server', // place to be executed

  // You can use either time or interval
  // time: '12:30',  // run at certain time, NOT IMPLEMENTED
  interval: '2s',    // interval between task executions

  async run(task) {
    console.log('Execute task one');
    console.dir({ task });
    // throw on fail
  },

  // Additional task properties in runtime:
  //
  //  name: 'name',     // file name without extension used to access tasks
  //  success: null,    // last execution status: null, true, false
  //  error: null,      // last error or null (if success)
  //  lastStart: null,  // last execution start time or null (never)
  //  lastEnd: null,    // last execution end time or null (never)
  //  executing: false, // current status
  //  active: false,    // is active in current process
  //  count: 0,         // executing count
});
