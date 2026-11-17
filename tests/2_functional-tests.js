const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let tid, rid;
  const B = '/api/threads/test', R = '/api/replies/test';
  const req = () => chai.request(server);

  test('Creating a new thread: POST request to /api/threads/{board}', done => {
    req().post(B).type('form').send({ text: 'hello', delete_password: 'pw' }).end((e, res) => {
      assert.equal(res.status, 200); done(); });
  });
  test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', done => {
    req().get(B).end((e, res) => {
      assert.isArray(res.body); assert.isAtMost(res.body.length, 10);
      assert.notProperty(res.body[0], 'delete_password'); assert.notProperty(res.body[0], 'reported');
      tid = res.body[0]._id; done(); });
  });
  test('Creating a new reply: POST request to /api/replies/{board}', done => {
    req().post(R).type('form').send({ text: 'rep', delete_password: 'rp', thread_id: tid }).end((e, res) => {
      assert.equal(res.status, 200); done(); });
  });
  test('Viewing a single thread with all replies: GET request to /api/replies/{board}', done => {
    req().get(R).query({ thread_id: tid }).end((e, res) => {
      assert.equal(res.body.replies.length, 1); rid = res.body.replies[0]._id;
      assert.notProperty(res.body.replies[0], 'delete_password'); done(); });
  });
  test('Reporting a thread: PUT request to /api/threads/{board}', done => {
    req().put(B).send({ thread_id: tid }).end((e, res) => { assert.equal(res.text, 'reported'); done(); });
  });
  test('Reporting a reply: PUT request to /api/replies/{board}', done => {
    req().put(R).send({ thread_id: tid, reply_id: rid }).end((e, res) => { assert.equal(res.text, 'reported'); done(); });
  });
  test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', done => {
    req().delete(R).send({ thread_id: tid, reply_id: rid, delete_password: 'x' }).end((e, res) => {
      assert.equal(res.text, 'incorrect password'); done(); });
  });
  test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', done => {
    req().delete(R).send({ thread_id: tid, reply_id: rid, delete_password: 'rp' }).end((e, res) => {
      assert.equal(res.text, 'success'); done(); });
  });
  test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', done => {
    req().delete(B).send({ thread_id: tid, delete_password: 'x' }).end((e, res) => {
      assert.equal(res.text, 'incorrect password'); done(); });
  });
  test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', done => {
    req().delete(B).send({ thread_id: tid, delete_password: 'pw' }).end((e, res) => {
      assert.equal(res.text, 'success'); done(); });
  });
});
