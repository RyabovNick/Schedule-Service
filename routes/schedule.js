const router = require('express').Router();
const sql = require('mssql');
const pool = require('../config/config');

router.route('/teachers/:fio').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input('fio', sql.NVarChar, req.params.fio);
    request.query(
      `
      Select TOP (1000)
      CASE WHEN
        first_week.[Day] is null THEN second_week.[Day]
      ELSE first_week.[Day] END as [Day],
      CASE WHEN
        first_week.[Lesson] is null THEN second_week.[Lesson]
      ELSE first_week.[Lesson] END as [Lesson],
      CASE WHEN
        first_week.[Lecturer] is null THEN second_week.[Lecturer]
      ELSE first_week.[Lecturer] END as [Lecturer],
      CASE WHEN
        first_week.[Subject_Type] is null THEN second_week.[Subject_Type]
      ELSE first_week.[Subject_Type] END as [Subject_Type],
      CASE 
        WHEN first_week.[Groups] = second_week.[Groups] THEN CONCAT(first_week.Cabinet, ' ', first_week.[Subject], ' - ', first_week.[Groups])
        WHEN first_week.[Groups] is null and second_week.[Groups] is not null THEN CONCAT('/ ', second_week.Cabinet, ' ', second_week.[Subject], ' - ', second_week.[Groups])
        WHEN first_week.[Groups] is not null and second_week.[Groups] is null THEN CONCAT(first_week.Cabinet, ' ', first_week.[Subject], ' - ', first_week.[Groups], ' /')
        WHEN first_week.[Groups] is not null and second_week.[Groups] is not null THEN CONCAT(first_week.Cabinet, ' ', first_week.[Subject], ' - ', first_week.[Groups], ' / ', second_week.Cabinet, ' ', second_week.[Subject], ' - ', second_week.[Groups])
      END as [Groups]
    FROM (
    SELECT days.*, lect_pairs.[Lesson], lect_pairs.[Lecturer], lect_pairs.[Subject], lect_pairs.[Cabinet], lect_pairs.[Subject_Type], lect_pairs.[Groups]
    FROM [UniASR].[dbo].[Days] as days
    LEFT JOIN (
    SELECT [Day_Number] as [Day]
          ,[Lesson_ID] as [Lesson]
          ,[Lecturer]
        ,[_Subject] as [Subject]
        ,[_Subject_Type] as [Subject_Type]
        ,[Cabinet]
        ,STUFF(( Select  ', ' + [_GROUP] as [text()] -- группы записать в строку
        FROM [UniASR].[dbo].[аср_Расписание] r_stuff
        where GETDATE() between DATEADD(YEAR, -2000, DATEADD(DAY, -30, [start])) and DATEADD(YEAR, -2000, [finish])
        and [Lecturer] like @fio
        and r.[Lesson_ID] = r_stuff.[Lesson_ID] and r.[Day_Number] = r_stuff.[Day_Number] and r.[Lecturer] = r_stuff.[Lecturer]
        and [Day_Number] between 1 and 7
        FOR XML PATH('')), 1, 1, '') AS [Groups]
      FROM [UniASR].[dbo].[аср_Расписание] r
      where GETDATE() between DATEADD(YEAR, -2000, DATEADD(DAY, -30, [start])) and DATEADD(YEAR, -2000, [finish])
      and [Lecturer] like @fio
      and [Day_Number] between 1 and 7
      group by [Lesson_ID], [Day_Number], [Lecturer], [_Subject], [Cabinet], [_Subject_Type]) as lect_pairs on days.[Day] = lect_pairs.[Day]
    ) as first_week
    FULL OUTER JOIN (
    SELECT [Day_Number] - 7 as [Day]
          ,[Lesson_ID] as [Lesson]
          ,[Lecturer]
        ,[_Subject] as [Subject]
        ,[_Subject_Type] as [Subject_Type]
        ,[Cabinet]
        ,STUFF(( Select  ', ' + [_GROUP] as [text()] -- группы записать в строку
        FROM [UniASR].[dbo].[аср_Расписание] r_stuff
        where GETDATE() between DATEADD(YEAR, -2000, DATEADD(DAY, -30, [start])) and DATEADD(YEAR, -2000, [finish])
        and [Lecturer] like @fio
        and r.[Lesson_ID] = r_stuff.[Lesson_ID] and r.[Day_Number] = r_stuff.[Day_Number] and r.[Lecturer] = r_stuff.[Lecturer]
        and [Day_Number] between 8 and 14
        FOR XML PATH('')), 1, 1, '') AS [Groups]
      FROM [UniASR].[dbo].[аср_Расписание] r
      where GETDATE() between DATEADD(YEAR, -2000, DATEADD(DAY, -30, [start])) and DATEADD(YEAR, -2000, [finish])
      and [Lecturer] like @fio
      and [Day_Number] between 8 and 14
      group by [Lesson_ID], [Day_Number], [Lecturer], [_Subject], [Cabinet], [_Subject_Type]) as second_week
    ON first_week.[Day] = second_week.[Day] and first_week.[Lesson] = second_week.[Lesson]
    order by [Day], [Lesson]
    
    `,
      (err, result) => {
        if (err) res.sendStatus(400);

        let getSchedule = result.recordset;

        let i;
        let schedule = [];
        for (i = 0; i < result.recordset.length; i++) {
          if (getSchedule[i].Lesson === null) schedule.push(getSchedule[i]);
          else {
            // save current day
            let day = getSchedule[i].Day;
            let lessons = [];
            while (true) {
              lessons.push(getSchedule[i]);
              if (getSchedule[i + 1].Day !== day) break;
              else i++;
            }
            schedule.push({ Day: day, lessons });
          }
        }
        pool.close();
        res.send(schedule);
      },
    );
  });
});

module.exports = router;
