/**
 * link to the APIs
 */
const router = require('express').Router();
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

router.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
    {
      skip: (req, res) => {
        return res.statusCode < 400;
      },
      stream: fs.createWriteStream(
        path.join(__dirname, '../logs/access-error.log'),
        {
          flags: 'a',
        },
      ),
    },
  ),
);

//сохраняем все логи
router.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
    {
      stream: fs.createWriteStream(path.join(__dirname, '../logs/access.log'), {
        flags: 'a',
      }),
    },
  ),
);

router.use('/api', require('./schedule'));

module.exports = router;
