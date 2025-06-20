const db = require('../models');
const app = require('../app');
const request = require('supertest');
const cheerio = require("cheerio");

describe('first test suite',()=>{
    test('demo',()=>{
        expect(true).toBe(true);
    })
})


const { sequelize, User } = require('../models');
let agent;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // reset test DB
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




// describe('Authentication Routes', () => {
//   test('Signup new user', async () => {
//     const res = await request(app)
//       .post('/users')
//       .send({
//         role: 'student',
//         firstName: 'Test',
//         lastName: 'User',
//         email: 'testuser@example.com',
//         password: 'testpass123'
//       });
      
//     console.log('Signup Error Body:', res.text);
//     expect(res.statusCode).toBe(302); // Redirect after signup
//   });

//   test('Login with correct credentials', async () => {
//     const res = await request(app)
//       .post('/session')
//       .send({
//         email: 'testuser@example.com',
//         password: 'testpass123'
//       });

//     expect(res.statusCode).toBe(302);
//   });

//   test('Login with wrong password fails', async () => {
//     const res = await request(app)
//       .post('/session')
//       .send({
//         email: 'testuser@example.com',
//         password: 'wrongpass'
//       });

//     expect(res.statusCode).toBe(302);
//   });
// });

