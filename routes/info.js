const router = require('express').Router();
const sql = require('mssql');
const pool = require('../config/config_universityPROF');
const { logger } = require('../lib/logger');

router.route('/groups/:group').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input('group', sql.NVarChar, req.params.group);
    request.query(
      `
      SELECT [Код] as code
        ,[Полное_Имя] as fio
        ,[Фамилия] as surname
        ,[Имя] as name
        ,[Отчество] as patronymic
        ,[Дата_Рождения] as birth
        ,[Пол] as sex
        ,[Форма_Обучения] as form
        ,[Факультет] as faculty
        ,[Направление] as dir
        ,[Профиль] as profile
        ,[Курс] as course
        ,[Группа] as [group]
        ,[Статус] as status
        ,[Основа] as basis
        ,[Вид_Образования] as form
        ,[Уровень_Подготовки] as level
        ,[Учебный_Год] as year
      FROM [UniversityPROF].[dbo].[су_ИнформацияОСтудентах]
      where [Группа] = @group
        and [Статус] = 'Является студентом'
      order by fio
    `,
      (err, result) => {
        if (err) {
          logger.log('error', 'Get group info error', { err });
          res.sendStatus(400);
        }

        logger.log('info', 'Get group info success', {
          result: req.params.group,
        });

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});

router.route('/teacher/:fio').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    const request = new sql.Request(pool);
    request.input('fio', sql.NVarChar, req.params.fio);
    request.query(
      `
      SELECT [ФизическоеЛицо_Ссылка] as id
        ,[ФИО] as fio
        ,[УченаяСтепень] as degree
        ,[УченоеЗвание] as title
        ,[Кафедра] as caf
        ,[Должность] as position
        ,[Стаж] as [exp]
      FROM [UniversityPROF].[dbo].[су_СписокППС]
      where [ФИО] = @fio
      order by exp desc
    `,
      (err, result) => {
        if (err) {
          logger.log('error', 'Get teacher info error', { err });
          res.sendStatus(400);
        }

        logger.log('info', 'Get teacher info success', {
          result: req.params.fio,
        });

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});

module.exports = router;
