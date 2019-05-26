const router = require('express').Router();
const sql = require('mssql');
const pool = require('../config/config_universityPROF');
const { loggerPriem } = require('../lib/logger');

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
          (SELECT [Наименование] as [fio]
                ,[КонкурснаяГруппа] as [konkursGroup]
                ,[ОснованиеПоступления] as [osnovaniePost]
                ,[Специальность] as [spec]
                ,[КодСпециальности] as [code]
                ,[КоличествоМест] as [mest]
              ,CASE WHEN [БаллИндивидуальноеДостижение] is null THEN 0 ELSE [БаллИндивидуальноеДостижение] END as [indiv]
              ,[Предмет] as [pred]
              ,max(cast([БаллЕГЭ] as INT)) as [ege]
            FROM [UniversityPROF].[dbo].[прием_ПоданныеДокументы_2018]
            where [УровеньПодготовки] in ('Бакалавр','Специалист','Академический бакалавр','Прикладной бакалавр') and [СостояниеАбитуриента] = 'Зачислен' and [ЕГЭДействительно] = 'Да' and [КодСпециальности] = @code
            and [Предмет] in (Select distinct [Предмет] from [UniversityPROF].[dbo].[прием_ПредметыВКонкурснойГруппе_2018] where [КодСпециальности] = @code)
            GROUP BY [Наименование],
                [КонкурснаяГруппа],
                [ОснованиеПоступления],
                [Специальность],
                [КодСпециальности],
                [КоличествоМест],
                [БаллИндивидуальноеДостижение],
                [Предмет]
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
