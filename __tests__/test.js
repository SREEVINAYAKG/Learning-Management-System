const db = require('../models');
const app = require('../app');
const request = require('supertest');
const cheerio = require("cheerio");
jest.setTimeout(10000);

describe('first test suite',()=>{
    test('demo',()=>{
        expect(true).toBe(true);
    })
})


const { sequelize, User } = require('../models');
let agent;
let educatorAgent;
let studentAgent;
let courseId, chapterId, pageId;
function extractCsrfToken(res) {
  const $ = cheerio.load(res.text);
  return $('[name=_csrf]').val();
}



beforeAll(async () => {
  await sequelize.sync({ force: true }); // reset test DB
    agent = request.agent(app); // used for signup and login
  educatorAgent = request.agent(app);
  studentAgent = request.agent(app);
});

afterAll(async () => {
  await sequelize.close();
});

describe('User Model', () => {

  test('should create a user with valid data', async () => {
    const user = await User.create({
      role: 'student',
      firstName: 'Sree',
      lastName: 'Vinayak',
      email: 'sree@example.com',
      password: 'securepassword'
    });

    expect(user).toBeDefined();
    expect(user.id).toBeGreaterThan(0);
    expect(user.email).toBe('sree@example.com');
    expect(user.role).toBe('student');
  });

  test('should fail to create a user with invalid email', async () => {
    try {
      await User.create({
        role: 'educator',
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
        password: 'password123'
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.errors[0].message).toMatch('/must be a valid email/i');
    }
  });

  test('should fail to create a user without required fields', async () => {
    try {
      await User.create({});
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const messages = err.errors.map(e => e.message);
      expect(messages).toContain('User.role cannot be null');
      expect(messages).toContain('User.email cannot be null');
    }
  });

  test('should fail to create a user with invalid role', async () => {
    try {
      await User.create({
        role: 'admin',
        firstName: 'Fake',
        lastName: 'User',
        email: 'fake@example.com',
        password: '123456'
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const messages = err.errors.map(e => e.message);
      expect(messages).toContain('Validation on role failed');
    }
  });
});


describe('Authentication Routes', () => {
  test('Signup new user', async () => {
    const res = await request(app)
      .post('/users')
      .send({
        role: 'student',
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        password: 'testpass123'
      });
      
    console.log('Signup Error Body:', res.text);
    expect(res.statusCode).toBe(302); // Redirect after signup
  });

  test('Login with correct credentials', async () => {
    const res = await request(app)
      .post('/session')
      .send({
        email: 'testuser@example.com',
        password: 'testpass123'
      });

    expect(res.statusCode).toBe(302);
  });

  test('Login with wrong password fails', async () => {
    const res = await request(app)
      .post('/session')
      .send({
        email: 'testuser@example.com',
        password: 'wrongpass'
      });

    expect(res.statusCode).toBe(302);
  });
});























































// beforeAll(async () => {
//   await db.sequelize.sync({ force: true });

//   // Create educator
//   educatorAgent = request.agent(app);
//   let res = await educatorAgent.get('/signup');
//   let csrf = extractCsrfToken(res);

//   await educatorAgent.post('/users').type('form').send({
//     role: 'educator',
//     firstName: 'Edu',
//     lastName: 'Cat',
//     email: 'educator@example.com',
//     password: '12345678',
//     _csrf: csrf,
//   });

//   res = await educatorAgent.get('/login');
//   csrf = extractCsrfToken(res);

//   await educatorAgent.post('/session').type('form').send({
//     email: 'educator@example.com',
//     password: '12345678',
//     _csrf: csrf,
//   });

//   // Create student
//   studentAgent = request.agent(app);
//   res = await studentAgent.get('/signup');
//   csrf = extractCsrfToken(res);

//   await studentAgent.post('/users').type('form').send({
//     role: 'student',
//     firstName: 'Stu',
//     lastName: 'Dent',
//     email: 'student@example.com',
//     password: '12345678',
//     _csrf: csrf,
//   });

//   res = await studentAgent.get('/login');
//   csrf = extractCsrfToken(res);

//   await studentAgent.post('/session').type('form').send({
//     email: 'student@example.com',
//     password: '12345678',
//     _csrf: csrf,
//   });
// });

// afterAll(async () => {
//   await db.sequelize.close();
// });

// describe('Educator Course Creation Flow', () => {
//   test('Educator creates course', async () => {
//     let res = await educatorAgent.get('/educator_dashboard/create_course');
//     const csrf = extractCsrfToken(res);

//     res = await educatorAgent.post('/educator_dashboard/create_course').type('form').send({
//       title: 'Maths 101',
//       description: 'Basic math course',
//       _csrf: csrf,
//     });

//     expect(res.statusCode).toBe(302);
//     const course = await db.Courses.findOne({ where: { title: 'Maths 101' } });
//     expect(course).toBeDefined();
//     courseId = course.id;
//   });

//   test('Educator creates chapter', async () => {
//     const res = await educatorAgent.get(`/educator_dashboard/courses/${courseId}/chapters/new`);
//     const csrf = extractCsrfToken(res);

//     const response = await educatorAgent.post(`/educator_dashboard/courses/${courseId}/chapters`).type('form').send({
//       title: 'Introduction',
//       _csrf: csrf,
//     });

//     expect(response.statusCode).toBe(302);
//     const chapter = await db.Chapters.findOne({ where: { title: 'Introduction' } });
//     expect(chapter).toBeDefined();
//     chapterId = chapter.id;
//   });

//   test('Educator creates page', async () => {
//     const res = await educatorAgent.get(`/educator_dashboard/courses/${courseId}/chapters/${chapterId}/pages/new`);
//     const csrf = extractCsrfToken(res);

//     const response = await educatorAgent.post(`/educator_dashboard/courses/${courseId}/chapters/${chapterId}/pages`).type('form').send({
//       title: 'What is Math?',
//       content: 'Math is the study of numbers.',
//       _csrf: csrf,
//     });

//     expect(response.statusCode).toBe(302);
//     const page = await db.Pages.findOne({ where: { title: 'What is Math?' } });
//     expect(page).toBeDefined();
//     pageId = page.id;
//   });
// });

// describe('Student Enrollment and Navigation', () => {
//   test('Student enrolls in course', async () => {
//     const res = await studentAgent.get(`/courses/${courseId}`);
//     const csrf = extractCsrfToken(res);

//     const enrollRes = await studentAgent.post(`/courses/${courseId}/enroll`).type('form').send({
//       _csrf: csrf,
//     });

//     expect(enrollRes.statusCode).toBe(302);
//     const enrollment = await db.Enrollments.findOne({ where: { CourseId: courseId } });
//     expect(enrollment).toBeDefined();
//   });

//   test('Student views course page', async () => {
//     const res = await studentAgent.get(`/courses/${courseId}/pages/${pageId}`);
//     expect(res.statusCode).toBe(200);
//     expect(res.text).toMatch(/What is Math?/i);
//   });

//   test('Student marks page as complete', async () => {
//     const res = await studentAgent.get(`/courses/${courseId}/pages/${pageId}`);
//     const csrf = extractCsrfToken(res);

//     const response = await studentAgent.post(`/courses/${courseId}/pages/${pageId}/complete`).type('form').send({
//       _csrf: csrf,
//     });

//     expect(response.statusCode).toBe(302);

//     const progress = await db.Progress.findOne({ where: { PageId: pageId } });
//     expect(progress).toBeDefined();
//     expect(progress.completed).toBe(true);
//   });
// });




// describe("Authentication Routes", () => {
//   test("Signup new user", async () => {
//     const res = await agent.post("/users").send({
//       role: "student",
//       firstName: "Test",
//       lastName: "Student",
//       email: "student@example.com",
//       password: "testpassword",
//     });
//     expect(res.statusCode).toBe(302); // redirect to login or dashboard
//   });

//   test("Login with correct credentials", async () => {
//     const res = await agent.post("/session").send({
//       email: "student@example.com",
//       password: "testpassword",
//     });
//     expect(res.statusCode).toBe(302); // redirect to dashboard
//   });

//   test("Login with wrong password fails", async () => {
//     const res = await agent.post("/session").send({
//       email: "student@example.com",
//       password: "wrongpassword",
//     });
//     expect(res.statusCode).toBe(302); // redirect with flash error
//   });
// });

// describe("Course Routes", () => {
//   let educatorAgent;
//   let courseId;

//   beforeAll(async () => {
//     educatorAgent = request.agent(app);
//     // Signup and login an educator
//     await educatorAgent.post("/users").send({
//       role: "educator",
//       firstName: "Educator",
//       lastName: "One",
//       email: "educator@example.com",
//       password: "educatorpass",
//     });

//     await educatorAgent.post("/session").send({
//       email: "educator@example.com",
//       password: "educatorpass",
//     });
//   });

//   test("Create new course", async () => {
//     const res = await educatorAgent.post("/educator_dashboard/create_course").send({
//       name: "Node.js Basics",
//       description: "Learn fundamentals of Node.js",
//     });
//     expect(res.statusCode).toBe(302);
//   });

//   test("View educator dashboard", async () => {
//     const res = await educatorAgent.get("/educator_dashboard");
//     expect(res.statusCode).toBe(200);
//     expect(res.text).toMatch(/Node\.js Basics/);
//   });
// });

// describe("Student Enrollment and Access", () => {
//   let studentAgent;

//   beforeAll(async () => {
//     studentAgent = request.agent(app);
//     await studentAgent.post("/users").send({
//       role: "student",
//       firstName: "New",
//       lastName: "Student",
//       email: "newstudent@example.com",
//       password: "12345678",
//     });
//     await studentAgent.post("/login").send({
//       email: "newstudent@example.com",
//       password: "12345678",
//     });
//   });

//   test("View available courses", async () => {
//     const res = await studentAgent.get("/student_dashboard");
//     expect(res.statusCode).toBe(200);
//     expect(res.text).toMatch(/Node\.js Basics/);
//   });

//   test("Enroll in course", async () => {
//     // Get courseId from page
//     const res = await studentAgent.get("/student_dashboard");
//     const $ = cheerio.load(res.text);
//     const enrollLink = $("a[href^='/student/courses/']").first().attr("href");
//     const match = enrollLink.match(/\/student\/courses\/(\d+)\/enroll/);
//     const courseId = match ? match[1] : null;
//     expect(courseId).toBeDefined();

//     const enrollRes = await studentAgent.get(`/student_dashboard/courses/${courseId}/enroll`);
//     expect(enrollRes.statusCode).toBe(302);
//   });

//   test("Access enrolled course content", async () => {
//     const res = await studentAgent.get("/student_dashboard");
//     expect(res.text).toMatch(/Enrolled Courses/);
//   });
// });




