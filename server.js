// We first require our express package
var express = require('express');
var bodyParser = require('body-parser');
var cartData = require('./data_cart.js');
var recipeData = require('./data_recipe.js');
var usersData = require('./data_users.js');
var cookieParser = require('cookie-parser');
Guid = require('Guid');

// This package exports the function to create an express instance:
var app = express();

// We can setup Jade now!
app.set('view engine', 'ejs');

// This is called 'adding middleware', or things that will help parse your request
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser()); //for parsing cookies

// This middleware will activate for every request we make to 
// any path starting with /assets;
// it will check the 'static' folder for matching files 
app.use('/assets', express.static('static'));


var cookie;

app.use(function(request, response, next) {
	cookie = request.cookies.currentSessionId;
	console.log("Cookie in middleware::"+cookie);
	if (cookie != undefined) {
		usersData.getUserBySessionId(cookie).then(function(user) {
			  response.locals.user = user.currentSessionId;
			  if(response.locals.user){
				response.render("pages/success");
				
			} else{
				cookie = undefined;
			}
	   });
	  
	}
	
    next();
});



// Setup your routes here!

app.get("/", function (request, response) { 

console.log("cookie in get / ::"+cookie);
if(cookie == undefined)
response.render("pages/index", { pageTitle: "Welcome Home", loginFlag: true});

   
});

app.get("/home", function (request, response) {
    response.render("pages/search_results", { pageTitle: "Welcome Home" });

});

app.get("/cart", function (request, response) {
    // user id should be provided in request/response
        
    //var cart = cartData.getCart(userId);
    
    // sample cart before DB is implemented
    var exampleCart = {
        "_id": 50,
        "userId": 10,
        "recipes": [
            {
                "recipeId": 20,
                "recipeName": "Breakfast",
                "listOfIngredients": [
                    {
                        "ingredientId": 30,
                        "ingredientName": "Eggs",
                        "price": 2.50,
                        "minQuantity": 1,
                        "quantity": 2
                    },
                    {
                        "ingredientId": 31,
                        "ingredientName": "Butter",
                        "price": 1.50,
                        "minQuantity": 1,
                        "quantity": 1
                    },
                    {
                        "ingredientId": 32,
                        "ingredientName": "Toast",
                        "price": 1.00,
                        "minQuantity": 1,
                        "quantity": 2
                    },
                    {
                        "ingredientId": 33,
                        "ingredientName": "Orange Juice",
                        "price": 2.00,
                        "minQuantity": 1,
                        "quantity": 0
                    }
                ]
            },
            {
                "recipeId": 21,
                "recipeName": "Snack",
                "listOfIngredients": [
                    {
                        "ingredientId": 34,
                        "ingredientName": "Chips",
                        "price": 3.00,
                        "minQuantity": 2,
                        "quantity": 10
                    }
                ]
            }
        ]
    }
    response.render("pages/cart", { pageTitle: "Shopping Cart", cart: exampleCart });
});

/*
app.get("/", function (request, response) { 
    // We have to pass a second parameter to specify the root directory
    // __dirname is a global variable representing the file directory you are currently in
    response.sendFile("./pages/index.html", { root: __dirname });
});
*/

app.get("/register", function (request, response) {
    response.render("pages/register", { pageTitle: "Welcome Home" });
});

// Create a user
app.post("/createUser", function(request, response) {
    usersData.createUser(request.body.register_email, request.body.register_passwd).then(function(user) {
		if(user != "User already exists") {
			var expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + 1);
			response.cookie('currentSessionId', user.currentSessionId, { expires: expiresAt });
			response.render("pages/success");
		}else {
			response.render("pages/index", {signup_error: "User already exists"});
		}
    }, function(errorMessage) {
        response.status(500).json({ error: errorMessage });
    });
});

// Login
app.post("/login", function(request, response) {
	var uname,pwd;
	uname = request.body.login_email;
	pwd = request.body.login_passwd;
	if(uname && pwd){
    usersData.validateUser(uname, pwd).then(function(user) {
		var newSessionId = Guid.create().toString();
		var expiresAt = new Date();
			expiresAt.setHours(expiresAt.getHours() + 1);
			 response.cookie('currentSessionId', newSessionId, { expires: expiresAt });
			 usersData.updateSessionId(user._id, newSessionId).then(function(user) {
		 });
        response.render("pages/success");
    }, function(errorMessage) {
        response.render("pages/index", {login_error: errorMessage});
    });
	}
});

//Logout
app.post("/logout", function(request, response) {
		var anHourAgo = new Date();
        anHourAgo.setHours(anHourAgo.getHours() -1);
		var sessionId = null;
        // invalidate, then clear so that lastAccessed no longer shows up on the
        // cookie object
		//remove session id from DB
		usersData.removeSessionId(cookie);
        response.cookie("currentSessionId", "", { expires: anHourAgo });
        response.clearCookie("currentSessionId");
        response.redirect('/'); //Inside a callback… bulletproof!
    
});


app.get("/product/category/:category",function (request, response){
    var category = request.params.category;
    recipeData.getCategory(category).then(function(result){
        for(var i=0; i<result.length; i++)
        {
            result[i] = recipeData.totalPrice(result[i]);
        }
        console.log(result);
        response.render("pages/product_category", {resultData : result})
    });
});

app.get("/add-product",function (request, response){
    response.render("pages/add-product");
});

app.post("/add-product",function (request, response){
    var recipe_name = request.body.recipe_name;
    var description = request.body.description;
    var image_url = request.body.image_url;
    var prep_time = request.body.prep_time;
    var cook_time = request.body.cook_time;
    var servings = request.body.servings;
    var cuisine = request.body.cuisine;
    var procedure = request.body.procedure;
    var ing_arr = request.body.i_name;
    var min_q = request.body.min_q;
    var price = request.body.price;
    var unit = request.body.unit;
    var ingredientArray = [];
    for(var i=0; i<ing_arr.length; i++)
    {
        var newIngredient = {
                    _id: Guid.create().toString(),
                    name: ing_arr[i],
                    min_q: min_q[i],
                    price: price[i],
                    unit: unit[i]
                }

        ingredientArray.push(newIngredient);
    }

    recipeData.addProduct(recipe_name, description, image_url, prep_time, cook_time, servings, cuisine, ingredientArray, procedure).then(function(result){
        if(result == true){
            response.send("ok");
        }
    });

    //console.log(recipe_name, description, image_url, prep_time, cook_time, servings, cuisine, procedure, ing_arr, min_q, price, unit);
    
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
