const router = require('express').Router();
const sql = require('mssql');
const pool = require('../config/config_universityPROF');
const {
  loggerPriem
} = require('../lib/logger');

const getSpecialityInfo = (req, res, year) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input('code', sql.NVarChar, req.params.code);
    request.query(
      `
      SELECT [КонкурснаяГруппа] as [group]
        ,[ФормаОбучения] as [form]
        ,[УровеньПодготовки] as [level]
        ,[ОснованиеПоступления] as [osnov]
        ,[Специальность] as [spec]
        ,[КодСпециальности] as [code]
        ,[КоличествоМест] as [places]
        ,[Всего] as [all]
        ,[Оригинал] as [orig]
      FROM [UniversityPROF].[dbo].[Vestra_прием_ПланыНабора_2019]
      where [КодСпециальности] = @code and [КоличествоМест] != 0
      order by [КоличествоМест] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get speciality info error', {
            err,
          });
          res.sendStatus(400);
        }

        loggerPriem.log('info', 'Get speciality info success', {
          result: req.params.code,
        });

        pool.close();
        res.send(result.recordset);
      },
    );
  });
};

router.route('/specialities').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.query(
      `
      SELECT distinct [Специальность] as spec
      ,[КодСпециальности] as code
      ,[Всего] as allZaya
      ,[Оригинал] as origZaya
      FROM [UniversityPROF].[dbo].[Vestra_прием_ПланыНабора_2019]
      where [УровеньПодготовки] != 'Магистр'
      order by [Специальность]
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get specialities error', {
            err,
          });
          res.sendStatus(400);
        }

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});
router.route('/specialities/info/:code').get((req, res, next) => {
  return getSpecialityInfo(req, res, getYearForCurrentSpecialities());
});
router.route('/specialities/people/:code').get((req, res, next) => {
  let year = getYearForCurrentSpecialities();

  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input('code', sql.NVarChar, req.params.code);
    request.query(
      `
      Select [fio]
        ,[konkursGroup]
        ,[code]
        ,[indiv]
        ,[ege]
        ,[sum]
        FROM [dbo].[Vestra_АктуальныеБаллыЕГЭ_ИндивидуальныеДостижения]
        Where [code] = @code        
        ORDER BY [sum] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get speciality people error', {
            err,
          });
          res.sendStatus(400);
        }

        loggerPriem.log('info', 'Get speciality people success', {
          result: req.params.code,
        });

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});

router.route('/newSpecialities').get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    return res.send('AdmissionCommitteeHasNotStarted');
  let year = getCurrentDate().year;

  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.query(
      `
      SELECT [Специальность] as spec, SUM([Всего]) as numberOfApplications, SUM([Оригинал]) as numberOfOriginals, [КодСпециальности] as code
      FROM [UniversityPROF].[dbo].[Vestra_прием_ПланыНабора_2019]
	    Group by [Специальность], [КодСпециальности]
	    Order by spec
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get specialities error', {
            err,
          });
          res.sendStatus(400);
        }

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});
router.route('/newSpecialities/info/:code').get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    return res.send('AdmissionCommitteeHasNotStarted');
  return getSpecialityInfo(req, res, getCurrentDate().year);
});

router.route('/newSpecialities/people/:code').get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    res.send('AdmissionCommitteeHasNotStarted');
  pool.connect(err => {
    if (err) res.sendStatus(400);
    const request = new sql.Request(pool);
    request.input('code', sql.NVarChar, req.params.code);
    request.query(
      `
      Select [fio]
        ,[id]
        ,[konkursGroup]
        ,[code]
        ,[ege]
        ,[sum]
        ,[indiv]
        ,[documentType]
        FROM
        [UniversityPROF].[dbo].[Vestra_АктуальныеБаллыЕГЭ_ИндивидуальныеДостижения]
        Where [code] = @code        
        ORDER BY [sum] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get speciality people error', {
            err,
          });
          res.sendStatus(400);
        }

        loggerPriem.log('info', 'Get speciality people success', {
          result: req.params.code,
        });

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});

module.exports = router;

function getCurrentDate() {
  let currentTime = new Date();
  return {
    month: currentTime.getMonth() + 1,
    day: currentTime.getDate(),
    year: currentTime.getFullYear(),
  };
}

//возврящает true, когда приемка работает (с 20 июня по 1 ноября)
function admissionCommitteeInProcess() {
  return true;
  let currentDate = getCurrentDate();
  if (currentDate.month < 6 || currentDate.month > 11) return false;
  if (currentDate.month == 6 && currentDate.day < 20) return false;
  if (currentDate.month == 11 && currentDate.day > 1) return false;
}

//возврящает предыдущий год до тех пор, пока не закончится приемка (1 ноября)
function getYearForCurrentSpecialities() {
  let currentDate = getCurrentDate();
  if (currentDate.month < 11) return currentDate.year - 1;
  if (currentDate.month == 11 && currentDate.day <= 1)
    return currentDate.year - 1;
  return currentDate.year;
}

router.route('/applicants').get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    res.send('AdmissionCommitteeHasNotStarted');
  let year = getCurrentDate().year;
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.query(
      `
      Select distinct [fio],
        [id]
        FROM [dbo].[Vestra_АктуальныеБаллыЕГЭ_ИндивидуальныеДостижения]
        Order by fio
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get specialities error', {
            err,
          });
          res.sendStatus(400);
        }

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});

router.route('/applicants/info/:id').get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    res.send('AdmissionCommitteeHasNotStarted');
  let year = getCurrentDate().year;
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);

    request.input('id', sql.NVarChar, req.params.id);
    request.query(
      `
      Select [fio]
        ,[id]
        ,[konkursGroup]
        ,[code]
        ,[ege]
        ,[sum]
        ,[indiv]
        ,[documentType]
        FROM
        [UniversityPROF].[dbo].[Vestra_АктуальныеБаллыЕГЭ_ИндивидуальныеДостижения]
        Where [id] = @id      
        ORDER BY [sum] desc        
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get specialities error', {
            err,
          });
          res.sendStatus(400);
        }

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});