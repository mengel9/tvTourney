var Sequelize = require("sequelize");

module.exports = function(sequelize, tableConfig) {
	return sequelize.define('user_league', {
    email: Sequelize.STRING
	}, tableConfig); 
}
