const router = require('express').Router();
const sql = require('mssql');
const pool = require('../config/config_universityPROF');

router.route('/groups/:group').get((req, res, next) => {
  pool.connect(err => {
    if (err) res.sendStatus(400);

    // ищем какой сейчас учебный год (2018-2019 - нам надо 1-ое)
    const now = new Date();
    let year = null;
    if (now.getMonth() + 1 <= 7) {
      year = now.getFullYear() - 1;
    } else {
      year = now.getFullYear();
    }

    const request = new sql.Request(pool);
    request.input('group', sql.NVarChar, req.params.group);
    // в базе год +2000 лет хранится (4018, 4019 и т.д.)
    request.input('year', sql.NVarChar, year + 2000);
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
        and [Учебный_Год] = @year
      order by fio
    `,
      (err, result) => {
        if (err) res.sendStatus(400);

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
        ,[Фотография] as photo
      FROM [UniversityPROF].[dbo].[су_СписокППС]
      where [ФИО] = @fio
      order by exp desc
    `,
      (err, result) => {
        if (err) res.sendStatus(400);

        pool.close();
        res.send(result.recordset);
      },
    );
  });
});

module.exports = router;
