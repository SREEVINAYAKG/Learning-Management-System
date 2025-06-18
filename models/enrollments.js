'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Enrollments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
          Enrollments.belongsTo(models.User, { foreignKey: 'studentId' });
          Enrollments.belongsTo(models.Courses, { foreignKey: 'courseId' });

      // define association here
    }
  }
  Enrollments.init({
    studentId: DataTypes.INTEGER,
    courseId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Enrollments',
  });
  return Enrollments;
};