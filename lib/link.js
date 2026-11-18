'use strict';

const { metarhia, wt } = require('./deps.js');

const { MetacomPeer } = metarhia.metacom;
const port = wt.workerData?.port ?? null;
const peer = port ? new MetacomPeer({ port }) : null;

module.exports = { peer };
