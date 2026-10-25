import { 
  formatTeachers, 
  validateTeacher, 
  filterTeachers, 
  sortTeachers, 
  findTeacher, 
  getTeacherPercentage 
} from './app.js';

function runTests() {
  console.log("Завдання 1 (Форматування та об'єднання )");
  const teachers = formatTeachers();
  console.log(`Усього унікальних викладачів: ${teachers.length}`);
  console.log("Приклад першого об'єкта:", teachers[0]);

  console.log("\nЗавдання 2 (Валідація)");
  const validTeachers = teachers.filter(validateTeacher);
  console.log(`Валідних викладачів: ${validTeachers.length} з ${teachers.length}`);
  if (teachers.length > 0) {
    console.log("Чи валідний перший викладач?", validateTeacher(teachers[0]));
  }

  console.log("\nЗавдання 3 (Фільтрація)");
  const filtered = filterTeachers(teachers, { 
    country: "Germany", 
    gender: "Male" 
  });
  console.log(`Знайдено за фільтром (Germany + Male): ${filtered.length}`);

  console.log("\nЗавдання 4 (Сортування)");
  const sortedByAge = sortTeachers(teachers, "age", "asc");
  console.log("Топ-3 наймолодших викладачів:");
  console.table(sortedByAge.slice(0, 3).map(t => ({ 
    ПІБ: t.full_name, 
    Вік: t.age, 
    Країна: t.country 
  })));

  console.log("\nЗавдання 5 (Пошук)");
  const found = findTeacher(teachers, "Germany");
  console.log("Результат пошуку за запитом 'Germany':", found ? found.full_name : "Не знайдено");

  console.log("\nЗавдання 6 (Відсоток співпадінь)");
  const percentageOver30 = getTeacherPercentage(teachers, (t) => t.age > 30);
  console.log(`Відсоток викладачів старше 30 років: ${percentageOver30}%`);
}

runTests();