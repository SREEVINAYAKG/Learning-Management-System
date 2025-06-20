'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {

      User.hasMany(models.Courses,{
        foreignKey: 'userId',
      })

      User.belongsToMany(models.Courses, {
      through: models.Enrollments,
      foreignKey: 'studentId',
      as: 'EnrolledCourses',
    });

      User.belongsToMany(models.Pages, {
        through: models.pageCompletion,
        foreignKey: 'userId',
        as: 'CompletedPages',
      });
      // define association here
    }
  }
  User.init({
    role: DataTypes.STRING,
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};