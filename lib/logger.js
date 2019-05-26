const winston = require('winston');
const { createLogger, format, transports } = winston;
const fse = require('fs-extra');
const path = require('path');

/**
 * create files and folder if not exist
 */
const combinedLog = path.join(__dirname, '../logs/combined.log');
const errorLog = path.join(__dirname, '../logs/error.log');
const exceptionsLog = path.join(__dirname, '../logs/exceptions.log');

const combinedPriemLog = path.join(__dirname, '../logs/combinedPriem.log');
const errorPriemLog = path.join(__dirname, '../logs/errorPriem.log');
const exceptionsPriemLog = path.join(__dirname, '../logs/exceptionsPriem.log');

fse.ensureFile(combinedLog, err => {
  if (err) {
    console.log('err: ', err);
  }
});
fse.ensureFile(errorLog, err => {
  if (err) {
    console.log('err: ', err);
  }
});
fse.ensureFile(combinedPriemLog, err => {
  if (err) {
    console.log('err: ', err);
  }
});
fse.ensureFile(errorPriemLog, err => {
  if (err) {
    console.log('err: ', err);
  }
});
fse.ensureFile(exceptionsLog, err => {
  if (err) {
    console.log('err: ', err);
  }
});
fse.ensureFile(exceptionsPriemLog, err => {
  if (err) {
    console.log('err: ', err);
  }
});

const logger = createLogger({
  format: format.json(),
  defaultMeta: {
    service: 'schedule-service',
  },
  transports: [
    new transports.File({
      filename: errorLog,
      level: 'error',
      format: format.combine(
        format.timestamp({
          format: 'DD-MM-YYYY:HH:mm:ss ZZ',
        }),
        format.json(),
      ),
    }),
    new transports.File({
      filename: combinedLog,
      format: format.combine(
        format.timestamp({
          format: 'DD-MM-YYYY:HH:mm:ss ZZ',
        }),
        format.json(),
      ),
    }),
  ],
  exceptionHandlers: [new transports.File({ filename: exceptionsLog })],
});

const loggerPriem = createLogger({
  format: format.json(),
  defaultMeta: {
    service: 'priem-service',
  },
  transports: [
    new transports.File({
      filename: errorPriemLog,
      level: 'error',
      format: format.combine(
        format.timestamp({
          format: 'DD-MM-YYYY:HH:mm:ss ZZ',
        }),
        format.json(),
      ),
    }),
    new transports.File({
      filename: combinedPriemLog,
      format: format.combine(
        format.timestamp({
          format: 'DD-MM-YYYY:HH:mm:ss ZZ',
        }),
        format.json(),
      ),
    }),
  ],
  exceptionHandlers: [new transports.File({ filename: exceptionsPriemLog })],
});

logger.exceptions.handle(new transports.File({ filename: exceptionsLog }));
loggerPriem.exceptions.handle(
  new transports.File({ filename: exceptionsPriemLog }),
);

module.exports = {
  logger,
  loggerPriem,
};
