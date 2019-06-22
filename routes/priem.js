const router = require('express').Router();
const sql = require('mssql');
const pool = require('../config/config_universityPROF');
const {
  loggerPriem
} = require('../lib/logger');

router.route('/specialities').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.query(
      `
      SELECT distinct [Специальность] as spec
      ,[КодСпециальности] as code
      FROM [UniversityPROF].[dbo].[прием_ПланыНабора_2018]
      where [УровеньПодготовки] != 'Магистр'
      order by [Специальность]
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get specialities error', {
            err
          });
          res.sendStatus(400);
        }

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});

//Переделать!!!!!
//ДЛЯ коммита
router.route('/newSpecialities').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.query(
      `
      SELECT distinct [Специальность] as spec
      ,[КодСпециальности] as code
      FROM [UniversityPROF].[dbo].[прием_ПланыНабора_2019]
      where [УровеньПодготовки] != 'Магистр'
      order by [Специальность]
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get specialities error', { err });
          res.sendStatus(400);
        }

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});







router.route('/specialities/info/:code').get((req, res, next) => {
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
      FROM [UniversityPROF].[dbo].[прием_ПланыНабора_2018]
      where [КодСпециальности] = @code and [КоличествоМест] != 0
      order by [КоличествоМест] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get speciality info error', {
            err
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
});



//Переделать!!!!
router.route('/newSpecialities/info/:code').get((req, res, next) => {
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
      FROM [UniversityPROF].[dbo].[прием_ПланыНабора_2019]
      where [КодСпециальности] = @code and [КоличествоМест] != 0
      order by [КоличествоМест] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get speciality info error', { err });
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
});




router.route('/specialities/people/:code').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input('code', sql.NVarChar, req.params.code);
    request.query(
      `
      Select [fio]
        ,[konkursGroup]
        ,[osnovaniePost]
        ,[spec]
        ,[code]
        ,[mest]
        ,[indiv]
        ,sum([ege]) as [ege]
        ,[indiv] + sum([ege]) as [sum]
        FROM
      (SELECT docs.[Наименование] as [fio]
            ,docs.[КонкурснаяГруппа] as [konkursGroup]
            ,docs.[ОснованиеПоступления] as [osnovaniePost]
            ,docs.[Специальность] as [spec]
            ,docs.[КодСпециальности] as [code]
            ,docs.[КоличествоМест] as [mest]
          ,CASE WHEN docs.[БаллИндивидуальноеДостижение] is null THEN 0 ELSE docs.[БаллИндивидуальноеДостижение] END as [indiv]
          ,docs.[Предмет] as [pred]
          ,max(cast(docs.[БаллЕГЭ] as INT)) as [ege]
        FROM [UniversityPROF].[dbo].[прием_ПоданныеДокументы_2018] as docs
        INNER JOIN [UniversityPROF].[dbo].[прием_ПредметыВКонкурснойГруппе_2018] as pred on pred.[КонкурснаяГруппа] = docs.[КонкурснаяГруппа] and pred.[Предмет] = docs.[Предмет]
        where docs.[УровеньПодготовки] in ('Бакалавр','Специалист','Академический бакалавр','Прикладной бакалавр') and docs.[СостояниеАбитуриента] = 'Зачислен' and docs.[ЕГЭДействительно] = 'Да' and docs.[КодСпециальности] = @code
        GROUP BY docs.[Наименование],
            docs.[КонкурснаяГруппа],
            docs.[ОснованиеПоступления],
            docs.[Специальность],
            docs.[КодСпециальности],
            docs.[КоличествоМест],
            docs.[БаллИндивидуальноеДостижение],
            docs.[Предмет]
            ) as sumDiffEge
        GROUP BY [fio],
            [konkursGroup],
            [osnovaniePost],
            [spec],
            [code],
            [mest],
            [indiv]
        ORDER BY [sum] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get speciality people error', {
            err
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



//Переделать!!!
router.route('/newSpecialities/people/:code').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input('code', sql.NVarChar, req.params.code);
    request.query(
      `
      Select [fio]
        ,[konkursGroup]
        ,[osnovaniePost]
        ,[spec]
        ,[code]
        ,[mest]
        ,[indiv]
        ,sum([ege]) as [ege]
        ,[indiv] + sum([ege]) as [sum]
        FROM
      (SELECT docs.[Наименование] as [fio]
            ,docs.[КонкурснаяГруппа] as [konkursGroup]
            ,docs.[ОснованиеПоступления] as [osnovaniePost]
            ,docs.[Специальность] as [spec]
            ,docs.[КодСпециальности] as [code]
            ,docs.[КоличествоМест] as [mest]
          ,CASE WHEN docs.[БаллИндивидуальноеДостижение] is null THEN 0 ELSE docs.[БаллИндивидуальноеДостижение] END as [indiv]
          ,docs.[Предмет] as [pred]
          ,max(cast(docs.[БаллЕГЭ] as INT)) as [ege]
        FROM [UniversityPROF].[dbo].[прием_ПоданныеДокументы_2019] as docs
        INNER JOIN [UniversityPROF].[dbo].[прием_ПредметыВКонкурснойГруппе_2019] as pred on pred.[КонкурснаяГруппа] = docs.[КонкурснаяГруппа] and pred.[Предмет] = docs.[Предмет]
        where docs.[УровеньПодготовки] in ('Бакалавр','Специалист','Академический бакалавр','Прикладной бакалавр') and docs.[ЕГЭДействительно] = 'Да' and docs.[КодСпециальности] = @code
        GROUP BY docs.[Наименование],
            docs.[КонкурснаяГруппа],
            docs.[ОснованиеПоступления],
            docs.[Специальность],
            docs.[КодСпециальности],
            docs.[КоличествоМест],
            docs.[БаллИндивидуальноеДостижение],
            docs.[Предмет]
            ) as sumDiffEge
        GROUP BY [fio],
            [konkursGroup],
            [osnovaniePost],
            [spec],
            [code],
            [mest],
            [indiv]
        ORDER BY [sum] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log('error', 'Get speciality people error', { err });
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
