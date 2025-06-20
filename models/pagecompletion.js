'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class pageCompletion extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {

      pageCompletion.belongsTo(models.User, { foreignKey: 'userId' });
      pageCompletion.belongsTo(models.Pages, { foreignKey: 'pageId' });
      // define association here
    }
  }
  pageCompletion.init({
    userId: DataTypes.INTEGER,
    pageId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'pageCompletion',
  });
  return pageCompletion;
};