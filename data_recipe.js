var MongoClient = require('mongodb').MongoClient,
 settings = require('./config.js'),
 runStartupForRecipe = require("./startup_recipe.js"),
 runStartupForUsers = require("./startup_users.js"),
 Guid = require('Guid');

var fullMongoUrl = settings.mongoConfig.serverUrl + settings.mongoConfig.database;
runStartupForRecipe(); // Creating db and recipe collections

runStartupForUsers(); // Creating users collections


var exports = module.exports = {};

MongoClient.connect(fullMongoUrl)
    .then(function(db) {
        var myCollection = db.collection("recipe");
        
         // setup your exports!
        exports.searchDB = function(keyword){
                   return db.collection('recipe').find({
                    "$text": {
                      "$search": keyword
                    }}).toArray().then(function(results){
                        return results;
                    })
        };

        exports.totalPrice = function(result){
            var ingredientsArray = result.ingredients;

            var totalPrice = 0;
            for(var i=0; i<ingredientsArray.length; i++)
            {

                totalPrice = totalPrice + ingredientsArray[i].price;
            }
            result.totalPrice = Math.round(totalPrice * 100) / 100;
            return result;
        };
        
        exports.getRecipe = function(id){
        	if (!id) return Promise.reject("This is broken link");

            // by calling .toArray() on the function, we convert the Mongo Cursor to a promise where you can 
            // easily iterate like a normal array
            return myCollection.find({ _id: id }).limit(1).toArray().then(function(listOfRecipes) {
                if (listOfRecipes.length === 0) throw "Recipe no longer exists";

                return listOfRecipes[0];
        });
    }
    });
