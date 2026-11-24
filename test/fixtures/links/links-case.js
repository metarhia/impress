({
  name: 'thread links',
  run: async () => {
    const { assert } = node;
    const call = (method, args, exclusive = false) =>
      application.invoke({ method, args, exclusive });

    assert.strictEqual(await call('lib.fixture.sum', { a: 2, b: 3 }), 5);
    const where = await call('lib.fixture.where', {});
    assert.notStrictEqual(where, application.worker.id);

    const hasCode = (error) => error.code === 'E_FIXTURE';
    const failing = call('lib.fixture.fail', { code: 'E_FIXTURE' });
    await assert.rejects(failing, hasCode);
    await assert.rejects(call('lib.fixture.missing', {}), /Handler not found/);
    await assert.rejects(call('lib.fixture.slow', { ms: 3500 }));

    const date = new Date(1700000000000);
    const map = new Map([['k', 1]]);
    const set = new Set([2]);
    const bytes = new Uint8Array([1, 2, 3]);
    const deep = { list: [1, { x: 1 }] };
    const value = { date, map, set, none: undefined, bytes, deep };
    const echoed = await call('lib.fixture.echo', value);
    const kind = Object.prototype.toString.call(echoed.date);
    assert.strictEqual(kind, '[object Date]');
    assert.strictEqual(echoed.date.getTime(), date.getTime());
    assert.strictEqual(echoed.map.get('k'), 1);
    assert.strictEqual(echoed.set.has(2), true);
    assert.strictEqual('none' in echoed, true);
    assert.strictEqual(echoed.bytes[2], 3);
    assert.strictEqual(echoed.deep.list[1].x, 1);

    const slow = (ms) => call('lib.fixture.slow', { ms }, true);
    const calls = [slow(2500), slow(2500), slow(2500)];
    const results = await Promise.allSettled(calls);
    const fulfilled = results.filter((item) => item.status === 'fulfilled');
    assert.strictEqual(fulfilled.length, 2);
    const rejected = results.find((item) => item.status === 'rejected');
    assert.match(rejected.reason.message, /No thread available/);
    assert.strictEqual(await slow(10), 10);

    const file = node.path.join(process.cwd(), 'ticks.txt');
    const task = { name: 'fixture-tick', every: '1s' };
    task.run = 'lib.fixture.tick';
    task.args = { file };
    const id = await application.scheduler.add(task);
    assert.match(id, /-id-/);
    let ticked = false;
    for (let i = 0; i < 50 && !ticked; i++) {
      await metarhia.metautil.delay(100);
      try {
        await node.fs.promises.access(file);
        ticked = true;
      } catch {
        // tick file is not written yet
      }
    }
    assert.strictEqual(ticked, true);
    await application.scheduler.stop('fixture-tick');
    await application.scheduler.remove(id);
  },
});
