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
      END as [Groups],
      CASE 
          WHEN first_week.[Groups] is null and second_week.[Groups] is not null THEN null
          ELSE first_week.Cabinet
        END as [Cab_fw],
      CASE 
          WHEN first_week.[Groups] is not null and second_week.[Groups] is null THEN null
          ELSE second_week.Cabinet
        END as [Cab_sw],
      CASE 
          WHEN first_week.[Groups] is null and second_week.[Groups] is not null THEN null
          ELSE first_week.[Subject]
        END as [Subject_fw],
      CASE 
          WHEN first_week.[Groups] is not null and second_week.[Groups] is null THEN null
          ELSE second_week.[Subject]
        END as [Subject_sw],
      CASE 
          WHEN first_week.[Groups] is null and second_week.[Groups] is not null THEN null
          ELSE first_week.[Groups]
        END as [Groups_short_fw],
      CASE 
          WHEN first_week.[Groups] is not null and second_week.[Groups] is null THEN null
          ELSE second_week.[Groups]
        END as [Groups_short_sw],
        CASE
          WHEN first_week.[Cabinet] = second_week.[Cabinet] and first_week.[Subject] = second_week.[Subject] and first_week.[Groups] = second_week.[Groups]
          THEN 0
          ELSE 1
        END as dif_weeks
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

router.route('/groups/:group').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input('group', sql.NVarChar, req.params.group);
    request.query(
      `
      Select TOP (1000)
	CASE WHEN
		first_week.[Day] is null THEN second_week.[Day]
	ELSE first_week.[Day] END as [Day],
	CASE WHEN
		first_week.[Lesson_ID] is null THEN second_week.[Lesson_ID]
	ELSE first_week.[Lesson_ID] END as [Lesson_ID],
	CASE WHEN
		first_week.[Subject_Type] = second_week.[Subject_Type] THEN first_week.[Subject_Type]
		WHEN first_week.[Subject_Type] is null and second_week.[Subject_Type] is not null THEN second_week.[Subject_Type]
		WHEN first_week.[Subject_Type] is not null and second_week.[Subject_Type] is null THEN first_week.[Subject_Type]
	END as [Subject_Type],
	CASE 
		WHEN first_week.[Lecturer] = second_week.[Lecturer] and first_week.[Subject] = second_week.[Subject] and first_week.[Cabinet] = second_week.[Cabinet]
			THEN CONCAT(first_week.[Cabinet], ' ', first_week.[Subject], ' ', first_week.[Lecturer])
		WHEN first_week.[Lecturer] is null and second_week.[Lecturer] is not null and first_week.[Subject] is null and second_week.[Subject] is not null and first_week.[Cabinet] is null and second_week.[Cabinet] is not null
			THEN CONCAT('/ ', second_week.[Cabinet], ' ', second_week.[Subject], ' ', second_week.[Lecturer])
		WHEN first_week.[Lecturer] is not null and second_week.[Lecturer] is null and first_week.[Subject] is not null and second_week.[Subject] is null and first_week.[Cabinet] is not null and second_week.[Cabinet] is null
			THEN CONCAT(first_week.[Cabinet], ' ', first_week.[Subject], ' ', first_week.[Lecturer], ' /')
		WHEN first_week.[Lecturer] is not null and second_week.[Lecturer] is not null and first_week.[Subject] is not null and second_week.[Subject] is not null and first_week.[Cabinet] is not null and second_week.[Cabinet] is not null
			THEN CONCAT(first_week.[Cabinet], ' ', first_week.[Subject], ' ', first_week.[Lecturer], ' / ', second_week.[Cabinet], ' ', second_week.[Subject], ' ', second_week.[Lecturer])
	END as full_lesson,
	CASE
		WHEN first_week.[Cabinet] is null THEN null
		ELSE first_week.[Cabinet]
	END as cab_fw,
	CASE
		WHEN second_week.[Cabinet] is null THEN null
		ELSE second_week.[Cabinet]
	END as cab_sw,
	CASE 
		WHEN first_week.[Subject] is null THEN null
		ELSE first_week.[Subject]
	END as subject_fw,
	CASE 
		WHEN second_week.[Subject] is null THEN null
		ELSE second_week.[Subject]
	END as subject_sw,
	CASE
		WHEN first_week.[Lecturer] is null THEN null
		ELSE first_week.[Lecturer]
	END as lecturer_fw,
	CASE
		WHEN second_week.[Lecturer] is null THEN null
		ELSE second_week.[Lecturer]
	END as lecturer_sw,
	CASE
		WHEN first_week.[Cabinet] = second_week.[Cabinet] and first_week.[Subject] = second_week.[Subject] and first_week.[Lecturer] = second_week.[Lecturer]
		THEN 0
		ELSE 1
	END as dif_weeks
		
FROM
(Select days.*,
	group_pairs.[Lesson_ID],
	group_pairs.[Lecturer],
	group_pairs.[Lesson],
	group_pairs.[Subject],
	group_pairs.[Subject_Type],
	group_pairs.[Cabinet]
FROM [UniASR].[dbo].[Days] as days
LEFT JOIN (
SELECT [Lesson_ID]
      ,[Day_Number]  AS [Day]
      ,[Lesson]
      ,[_Group] AS [Group]
      ,[_Subject] AS [Subject]
      ,[_Subject_Type] AS [Subject_Type]
      ,[Lecturer]
      ,[Cabinet]
      ,[Cabinet_Type]
  FROM [UniASR].[dbo].[аср_Расписание]
  where GETDATE() between DATEADD(YEAR, -2000, DATEADD(DAY, -30, [start])) and DATEADD(YEAR, -2000, [finish])
  and [_Group] = @group and [Day_Number] between 1 and 7
  ) as group_pairs ON days.[Day] = group_pairs.[Day]
) as first_week
FULL OUTER JOIN
(
SELECT [Lesson_ID]
      ,[Day_Number] - 7 AS [Day]
      ,[Lesson]
      ,[_Group] AS [Group]
      ,[_Subject] AS [Subject]
      ,[_Subject_Type] AS [Subject_Type]
      ,[Lecturer]
      ,[Cabinet]
      ,[Cabinet_Type]
  FROM [UniASR].[dbo].[аср_Расписание]
  where GETDATE() between DATEADD(YEAR, -2000, DATEADD(DAY, -30, [start])) and DATEADD(YEAR, -2000, [finish])
  and [_Group] = @group and [Day_Number] between 8 and 14
) as second_week ON first_week.[Day] = second_week.[Day] AND first_week.[Lesson] = second_week.[Lesson]
order by [Day], [Lesson_ID]
    
    `,
      (err, result) => {
        if (err) res.sendStatus(400);

        let getSchedule = result.recordset;

        let i;
        let schedule = [];
        for (i = 0; i < result.recordset.length; i++) {
          if (getSchedule[i].Lesson_ID === null) schedule.push(getSchedule[i]);
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

router.route('/teachers').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.query(
      `
      SELECT distinct TOP(1000) 
      [Lecturer_ID] as ID
      ,[Lecturer]
        FROM [UniASR].[dbo].[аср_Расписание]
        where GETDATE() between DATEADD(YEAR, -2000, DATEADD(DAY, -30, [start])) and DATEADD(YEAR, -2000, [finish])
        order by [Lecturer]
    `,
      (err, result) => {
        if (err) res.sendStatus(400);

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});

router.route('/groups').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input('group', sql.NVarChar, req.params.group);
    request.query(
      `
      SELECT distinct [Caf], [Group]
      FROM (
		Select Case 
			when [Facutet] is null THEN 'Не указана'
			ELSE [Facutet]
			END as [Caf], [_Group] as [Group]
		From [UniASR].[dbo].[аср_Расписание]
		where GETDATE() between DATEADD(YEAR, -2000, DATEADD(DAY, -30, [start])) and DATEADD(YEAR, -2000, [finish])
	  ) as r
	order by [Caf], [Group]
    `,
      (err, result) => {
        if (err) res.sendStatus(400);

        let getGroups = result.recordset;

        let i;
        let groupsAll = [];
        try {
          for (i = 0; i < getGroups.length; i++) {
            let caf = [];
            let cafNow = getGroups[i].Caf;
            while (true) {
              let course = getGroups[i].Group.slice(0, 1);
              let groups = [];
              while (true) {
                groups.push({ group: getGroups[i].Group });
                if (
                  i + 1 >= getGroups.length ||
                  getGroups[i + 1].Group.slice(0, 1) !== course
                )
                  break;
                else i++;
              }
              caf.push({ course, groups });
              if (i + 1 >= getGroups.length || getGroups[i + 1].Caf !== cafNow)
                break;
              else i++;
            }
            groupsAll.push({ caf: cafNow, courses: caf });
          }
          pool.close();
          res.send(groupsAll);
        } catch (err) {
          res.sendStatus(400);
        }
      },
    );
  });
});

module.exports = router;
