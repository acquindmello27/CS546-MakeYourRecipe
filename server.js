// We first require our express package
var express = require('express');
var bodyParser = require('body-parser');
var recipeData = require('./data_recipe.js');
var myData = require('./data_users.js');


// This package exports the function to create an express instance:
var app = express();

// We can setup Jade now!
app.set('view engine', 'ejs');

// This is called 'adding middleware', or things that will help parse your request
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// This middleware will activate for every request we make to 
// any path starting with /assets;
// it will check the 'static' folder for matching files 
app.use('/assets', express.static('static'));

// Setup your routes here!

app.get("/home", function (request, response) {
    response.render("pages/search_results", { pageTitle: "Welcome Home" });
});

app.get("/", function (request, response) { 
    // We have to pass a second parameter to specify the root directory
    // __dirname is a global variable representing the file directory you are currently in
    response.sendFile("./pages/index.html", { root: __dirname });
});



app.post("/search",function (request, response){
	var keyword = request.body.keyword;
	recipeData.searchDB(keyword).then(function(result) {  
        for(var i=0; i<result.length; i++)
        {
            result[i] = recipeData.totalPrice(result[i]);
        }
        response.render("pages/search_results",{resultData : result, keyword : keyword})
    });
});


app.get("/products/:id", function(request,response){
	console.log(request.params.id);
	recipeData.getRecipe(request.params.id).then(function(recipe){
		response.render("pages/product",{resultData: recipe});
	},function(errorMessage) {
        response.status(500).json({ error: errorMessage });
	});
});

// We can now navigate to localhost:3000
app.listen(3000, function () {
    console.log('Your server is now listening on port 3000! Navigate to http://localhost:3000 to access it');
});
