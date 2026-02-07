const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const xml2js = require('xml2js');

const app = express();
app.use(bodyParser.text({ type: ['text/xml', 'application/xml', '*/xml'] }));

const TOKEN = process.env.WECHAT_TOKEN || 'REPLACE_ME';

function checkSignature(signature, timestamp, nonce) {
  const str = [TOKEN, timestamp, nonce].sort().join('');
  const hash = crypto.createHash('sha1').update(str).digest('hex');
  return hash === signature;
}

app.get('/', (req, res) => res.send('ok'));

app.get('/wechat', (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;
  if (checkSignature(signature, timestamp, nonce)) {
    return res.send(echostr);
  }
  return res.status(401).send('Invalid signature');
});

app.post('/wechat', (req, res) => {
  const { signature, timestamp, nonce } = req.query;
  if (!checkSignature(signature, timestamp, nonce)) {
    return res.status(401).send('Invalid signature');
  }

  xml2js.parseString(req.body || '', { trim: true }, (err, result) => {
    if (err) return res.send('success');
    const msg = result.xml || {};

    if (msg.MsgType && msg.MsgType[0] === 'text') {
      const reply = `收到：${(msg.Content && msg.Content[0]) || ''}`;
      const now = Math.floor(Date.now() / 1000);
      const replyXml = `<xml>
<ToUserName><![CDATA[${(msg.FromUserName && msg.FromUserName[0]) || ''}]]></ToUserName>
<FromUserName><![CDATA[${(msg.ToUserName && msg.ToUserName[0]) || ''}]]></FromUserName>
<CreateTime>${now}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${reply}]]></Content>
</xml>`;
      return res.type('text/xml').send(replyXml);
    }

    return res.send('success');
  });
});

const port = process.env.PORT || 80;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
