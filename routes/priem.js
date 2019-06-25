const router = require("express").Router();
const sql = require("mssql");
const pool = require("../config/config_universityPROF");
const {
  loggerPriem
} = require("../lib/logger");

const getSpecialities = (res, year) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.query(
      `
      SELECT distinct [Специальность] as spec
      ,[КодСпециальности] as code
      FROM [UniversityPROF].[dbo].[прием_ПланыНабора_${year}]
      where [УровеньПодготовки] != 'Магистр'
      order by [Специальность]
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log("error", "Get specialities error", {
            err
          });
          res.sendStatus(400);
        }

        pool.close();
        res.send(result.recordset);
      }
    );
  });
};

const getSpecialityInfo = (req, res, year) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input("code", sql.NVarChar, req.params.code);
    request.query(
      `
      SELECT [КонкурснаяГруппа] as [group]
        ,[ФормаОбучения] as [form]
        ,[УровеньПодготовки] as [level]
        ,[ОснованиеПоступления] as [osnov]
        ,[Специальность] as [spec]
        ,[КодСпециальности] as [code]
        ,[КоличествоМест] as [places]
      FROM [UniversityPROF].[dbo].[прием_ПланыНабора_${year}]
      where [КодСпециальности] = @code and [КоличествоМест] != 0
      order by [КоличествоМест] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log("error", "Get speciality info error", {
            err
          });
          res.sendStatus(400);
        }

        loggerPriem.log("info", "Get speciality info success", {
          result: req.params.code
        });

        pool.close();
        res.send(result.recordset);
      }
    );
  });
};

router.route("/specialities").get((req, res, next) => {
  return getSpecialities(res, getYearForCurrentSpecialities());
});
router.route("/specialities/info/:code").get((req, res, next) => {
  return getSpecialityInfo(req, res, getYearForCurrentSpecialities());
});
router.route("/specialities/people/:code").get((req, res, next) => {
  let year = getYearForCurrentSpecialities();

  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input("code", sql.NVarChar, req.params.code);
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
        FROM [UniversityPROF].[dbo].[прием_ПоданныеДокументы_${year}] as docs
        INNER JOIN [UniversityPROF].[dbo].[прием_ПредметыВКонкурснойГруппе_${year}] as pred on pred.[КонкурснаяГруппа] = docs.[КонкурснаяГруппа] and pred.[Предмет] = docs.[Предмет]
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
          loggerPriem.log("error", "Get speciality people error", {
            err
          });
          res.sendStatus(400);
        }

        loggerPriem.log("info", "Get speciality people success", {
          result: req.params.code
        });

        pool.close();
        res.send(result.recordset);
      }
    );
  });
});

router.route("/newSpecialities").get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    return res.send("AdmissionCommitteeHasNotStarted");
  return getSpecialities(res, getCurrentDate().year);
});
router.route("/newSpecialities/info/:code").get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    return res.send("AdmissionCommitteeHasNotStarted");
  return getSpecialityInfo(req, res, getCurrentDate().year);
});
router.route("/newSpecialities/people/:code").get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    res.send("AdmissionCommitteeHasNotStarted");
  let year = getCurrentDate().year;
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input("code", sql.NVarChar, req.params.code);
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
        ,[credited]
        FROM
      (SELECT docs.[Наименование] as [fio]
            ,docs.[КонкурснаяГруппа] as [konkursGroup]
            ,docs.[ОснованиеПоступления] as [osnovaniePost]
            ,docs.[Специальность] as [spec]
            ,docs.[КодСпециальности] as [code]
            ,docs.[КоличествоМест] as [mest]
            ,CASE WHEN docs.[СостояниеАбитуриента] = 'Зачислен' THEN 'true' ELSE 'false' END as [credited]
          ,CASE WHEN docs.[БаллИндивидуальноеДостижение] is null THEN 0 ELSE docs.[БаллИндивидуальноеДостижение] END as [indiv]
          ,docs.[Предмет] as [pred]
          ,max(CASE WHEN docs.[БаллЕГЭ] IS NULL THEN 0 ELSE docs.[БаллЕГЭ] END) as [ege]
        FROM [UniversityPROF].[dbo].[прием_ПоданныеДокументы_${year}] as docs
        LEFT JOIN [UniversityPROF].[dbo].[прием_ПредметыВКонкурснойГруппе_${year}] as pred on pred.[КонкурснаяГруппа] = docs.[КонкурснаяГруппа] and pred.[Предмет] = docs.[Предмет]
        where docs.[УровеньПодготовки] in ('Бакалавр','Специалист','Академический бакалавр','Прикладной бакалавр') and docs.[СостояниеАбитуриента] in ('Подано','Зачислен') and docs.[ЕГЭДействительно] = 'Да' and docs.[КодСпециальности] = @code
        GROUP BY docs.[Наименование],
            docs.[КонкурснаяГруппа],
            docs.[ОснованиеПоступления],
            docs.[Специальность],
            docs.[КодСпециальности],
            docs.[КоличествоМест],
            docs.[БаллИндивидуальноеДостижение],
            docs.[Предмет],
            docs.[СостояниеАбитуриента]
            ) as sumDiffEge
        GROUP BY [fio],
            [konkursGroup],
            [osnovaniePost],
            [spec],
            [code],
            [mest],
            [indiv],
            [credited]
        ORDER BY [sum] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log("error", "Get speciality people error", {
            err
          });
          res.sendStatus(400);
        }

        loggerPriem.log("info", "Get speciality people success", {
          result: req.params.code
        });

        pool.close();
        res.send(result.recordset);
      }
    );
  });
});

module.exports = router;

function getCurrentDate() {
  let currentTime = new Date();
  return {
    month: currentTime.getMonth() + 1,
    day: currentTime.getDate(),
    year: currentTime.getFullYear()
  };
}

//возврящает true, когда приемка работает (с 20 июня по 1 ноября)
function admissionCommitteeInProcess() {
  let currentDate = getCurrentDate();
  if (currentDate.month < 6 || currentDate.month > 11) return false;
  if (currentDate.month == 6 && currentDate.day < 20) return false;
  if (currentDate.month == 11 && currentDate.day > 1) return false;
  return true;
}

//возврящает предыдущий год до тех пор, пока не закончится приемка (1 ноября)
function getYearForCurrentSpecialities() {
  let currentDate = getCurrentDate();
  if (currentDate.month < 11) return currentDate.year - 1;
  if (currentDate.month == 11 && currentDate.day <= 1)
    return currentDate.year - 1;
  return currentDate.year;
}

router.route("/applicants").get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    res.send("AdmissionCommitteeHasNotStarted");
  let year = getCurrentDate().year;
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.query(
      `
      Select distinct [fio],
        [id]
        FROM
      (SELECT docs.[Наименование] as [fio]
            ,docs.[Код] as [id]
            ,docs.[КонкурснаяГруппа] as [konkursGroup]
            ,CASE WHEN docs.[СостояниеАбитуриента] = 'Зачислен' THEN 'true' ELSE 'false' END as [credited]
          ,docs.[Предмет] as [pred]
          ,max(CASE WHEN docs.[БаллЕГЭ] IS NULL THEN 0 ELSE docs.[БаллЕГЭ] END) as [ege]
        FROM [UniversityPROF].[dbo].[прием_ПоданныеДокументы_${year}] as docs
        LEFT JOIN [UniversityPROF].[dbo].[прием_ПредметыВКонкурснойГруппе_${year}] as pred on pred.[КонкурснаяГруппа] = docs.[КонкурснаяГруппа] and pred.[Предмет] = docs.[Предмет]
        where docs.[УровеньПодготовки] in ('Бакалавр','Специалист','Академический бакалавр','Прикладной бакалавр') and docs.[СостояниеАбитуриента] in ('Подано','Зачислен') and docs.[ЕГЭДействительно] = 'Да'
        GROUP BY docs.[Код],
            docs.[Наименование],
            docs.[КонкурснаяГруппа],
            docs.[Предмет],
            docs.[СостояниеАбитуриента]
            ) as sumDiffEge
        ORDER BY [fio]
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log("error", "Get specialities error", {
            err
          });
          res.sendStatus(400);
        }

        pool.close();
        res.send(result.recordset);
      }
    );
  });
});

router.route("/applicants/info/:id").get((req, res, next) => {
  if (!admissionCommitteeInProcess())
    res.send("AdmissionCommitteeHasNotStarted");
  let year = getCurrentDate().year;
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);

    request.input("id", sql.NVarChar, req.params.id);
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
        ,[credited]
        FROM
      (SELECT docs.[Наименование] as [fio]
            ,docs.[КонкурснаяГруппа] as [konkursGroup]
            ,docs.[ОснованиеПоступления] as [osnovaniePost]
            ,docs.[Специальность] as [spec]
            ,docs.[КодСпециальности] as [code]
            ,docs.[КоличествоМест] as [mest]
            ,CASE WHEN docs.[СостояниеАбитуриента] = 'Зачислен' THEN 'true' ELSE 'false' END as [credited]
          ,CASE WHEN docs.[БаллИндивидуальноеДостижение] is null THEN 0 ELSE docs.[БаллИндивидуальноеДостижение] END as [indiv]
          ,docs.[Предмет] as [pred]
          ,max(CASE WHEN docs.[БаллЕГЭ] IS NULL THEN 0 ELSE docs.[БаллЕГЭ] END) as [ege]
        FROM [UniversityPROF].[dbo].[прием_ПоданныеДокументы_${year}] as docs
        LEFT JOIN [UniversityPROF].[dbo].[прием_ПредметыВКонкурснойГруппе_${year}] as pred on pred.[КонкурснаяГруппа] = docs.[КонкурснаяГруппа] and pred.[Предмет] = docs.[Предмет]
        where docs.[УровеньПодготовки] in ('Бакалавр','Специалист','Академический бакалавр','Прикладной бакалавр') and docs.[СостояниеАбитуриента] in ('Подано','Зачислен') and docs.[ЕГЭДействительно] = 'Да' and docs.[Код] = @id
        GROUP BY docs.[Наименование],
            docs.[КонкурснаяГруппа],
            docs.[ОснованиеПоступления],
            docs.[Специальность],
            docs.[КодСпециальности],
            docs.[КоличествоМест],
            docs.[БаллИндивидуальноеДостижение],
            docs.[Предмет],
            docs.[СостояниеАбитуриента]
            ) as sumDiffEge
        GROUP BY [fio],
            [konkursGroup],
            [osnovaniePost],
            [spec],
            [code],
            [mest],
            [indiv],
            [credited]
        ORDER BY [sum] desc
    `,
      (err, result) => {
        if (err) {
          loggerPriem.log("error", "Get specialities error", {
            err
          });
          res.sendStatus(400);
        }

        pool.close();
        res.send(result.recordset);
      }
    );
  });
});