import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import {rankDrivers} from '../src/services/matching/rank.js';

test('ranking is deterministic and includes explainable factors',()=>{
 const ride={pickup:{coordinates:[74.5,15.85]}};
 const drivers=[{_id:'far',location:{coordinates:[74.54,15.85]},acceptanceRate:.8},{_id:'near',location:{coordinates:[74.501,15.85]},acceptanceRate:.8}];
 const ranked=rankDrivers(ride,drivers);
 assert.equal(ranked[0].driver._id,'near');
 assert.ok(ranked[0].score>ranked[1].score);
 assert.equal(typeof ranked[0].factors.workload,'number');
});

test('protected booking requires a token without a database connection',async()=>{
 const server=http.createServer(app);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/rides`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert.equal(response.status,401);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
