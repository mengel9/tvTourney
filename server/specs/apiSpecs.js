/* server must be running when you executes the tests 
	run the test with "mocha apiSpecs.js" */
var serverHost = 'http://localhost:3000';
var should = require('should');
var assert = require('assert');
var request = require('supertest')(serverHost);
var Sequelize = require('sequelize');

describe('API', function() {

	/*establish a direct connection to the database so that cleanup
	can be performed after running tests. For example, after creating
	a testuser, this connection can be used to dive directly into the
	database and delete hat user*/
	var sequelize = new Sequelize('database', 'root', '', {
		host:'localhost',
		dialect: 'sqlite',

		pool: {
			max: 5,
			min: 0,
			idle: 10000
		},

		//queries wont be console logged
		logging: false,

		storage: '../db/db.sqlite'
	});

	describe('signup', function() {

		//user tests will try to create
		var testUser = {
				username: 'testUser',
				email: "testemail@gmail.com",
				password: '123qwe'
			}

		//cleanup - deletes inserted user from database
		after(function(done) {
			/* define the schema for the user model so that sequelize can
			construct the queries properly - this is not DRY with the 
			database models, can refactor this later for them to share
			models from the same file */
			var User = sequelize.define('user', {
	  		username: Sequelize.STRING,
	  		email: Sequelize.STRING,
	  		password: Sequelize.STRING
			});

			//find and destroy user
			User.find({where: {username: testUser.username}})
				.then(function(foundUser) {
					foundUser.destroy().then(function() {
						done();
					});
				});
		});

		it('should respond with the users object', function(done) {
			request.post('/signup')
				.send(testUser)
				//makes sure status code is correct
				.expect(201)
				//makes sure properties are correct
				.expect(function(res) {
					res.body.id.should.exist;
					res.body.username.should.equal(testUser.username);
					res.body.email.should.equal(testUser.email);
					res.body.password.should.equal(testUser.password);
				})
				.end(function(err, res) {
					if (err) {
						return done(err);
					}
					done();
					/*if there was a get method we could test to see if the user was created
					it would go here, but there is no GET equivalent of signup since we dont
					have a "view profile" equivalent */
				})
		});

		it('should respond with status code 400 if username already exists', function(done) {
			request.post('/signup')
			.send(testUser)
			.expect(400)
			.end(function (err, res) {
				if (err) {
					return done(err);
				}
				done();
			});
		});
	})
})