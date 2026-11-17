'use strict';
const crypto = require('crypto');

// shortcut: bellekte tutulur (sunucu kapanınca silinir), kalıcılık gerekirse MongoDB'ye taşı
const boards = {}; // board -> thread[]
const id = () => crypto.randomBytes(12).toString('hex');
const find = (b, tid) => (boards[b] || []).find(t => t._id === tid) || Object.values(boards).flat().find(t => t._id === tid);

const pubReply = r => ({ _id: r._id, text: r.text, created_on: r.created_on });
const pubThread = (t, n) => {
  const reps = t.replies.map(pubReply);
  return { _id: t._id, text: t.text, created_on: t.created_on, bumped_on: t.bumped_on,
    replycount: reps.length, replies: n ? reps.slice(-n) : reps };
};

module.exports = function (app) {
  app.route('/api/threads/:board')
    .post((req, res) => {
      const { text, delete_password } = req.body;
      const now = new Date();
      (boards[req.params.board] = boards[req.params.board] || []).push({
        _id: id(), text, delete_password, created_on: now, bumped_on: now, reported: false, replies: [] });
      res.redirect(`/b/${req.params.board}/`);
    })
    .get((req, res) => {
      const list = (boards[req.params.board] || [])
        .sort((a, b) => b.bumped_on - a.bumped_on).slice(0, 10);
      res.json(list.map(t => pubThread(t, 3)));
    })
    .delete((req, res) => {
      const { thread_id, delete_password } = req.body;
      const t = find(req.params.board, thread_id);
      if (!t || t.delete_password !== delete_password) return res.send('incorrect password');
      boards[req.params.board] = boards[req.params.board].filter(x => x !== t);
      res.send('success');
    })
    .put((req, res) => {
      const t = find(req.params.board, req.body.thread_id);
      if (t) t.reported = true;
      res.send('reported');
    });

  app.route('/api/replies/:board')
    .post((req, res) => {
      const { text, delete_password, thread_id } = req.body;
      const t = find(req.params.board, thread_id);
      if (!t) return res.send('thread not found');
      const now = new Date();
      t.replies.push({ _id: id(), text, delete_password, created_on: now, reported: false });
      t.bumped_on = now;
      res.redirect(`/b/${req.params.board}/${thread_id}`);
    })
    .get((req, res) => {
      const t = find(req.params.board, req.query.thread_id);
      if (!t) return res.json({ error: 'thread not found' });
      res.json(pubThread(t));
    })
    .delete((req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      const t = find(req.params.board, thread_id);
      const r = t && t.replies.find(x => x._id === reply_id);
      if (!r || r.delete_password !== delete_password) return res.send('incorrect password');
      r.text = '[deleted]';
      res.send('success');
    })
    .put((req, res) => {
      const t = find(req.params.board, req.body.thread_id);
      const rid = req.body.reply_id || req.body.report_id;
      const r = t && t.replies.find(x => x._id === rid);
      if (r) r.reported = true;
      res.send('reported');
    });
};
