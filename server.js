// We first require our express package
var express = require('express');
var bodyParser = require('body-parser');
var cartData = require('./data_cart.js');
var recipeData = require('./data_recipe.js');
var usersData = require('./data_users.js');
var cookieParser = require('cookie-parser');
var Guid = require('Guid');
var _xss = require('xss');
// This package exports the function to create an express instance:
var app = express();

// We can setup Jade now!
app.set('view engine', 'ejs');

// This is called 'adding middleware', or things that will help parse your request
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser()); //for parsing cookies


app.use('/assets', express.static('static'));


app.use('/logout',function(request, response, next){
        var sessionID = request.cookies.currentSessionID;

        usersData.removeSessionId(sessionID);

        var anHourAgo = new Date();
        anHourAgo.setHours(anHourAgo.getHours() -1);

        response.cookie("currentSessionId", "", {expires : anHourAgo});
        response.clearCookie("currentSessionId");
		
		response.cookie("isAdmin", "", {expires : anHourAgo});
        response.clearCookie("isAdmin");
        next();
});


app.use('/add-product',function(request, response, next){
        if(request.cookies.isAdmin){
            next();
        }
        else
        {
            response.redirect("/");
        }
    
});

app.use(function(request, response, next) {


    if(request.cookies.currentSessionId)
            {
                usersData.getUserBySessionId(request.cookies.currentSessionId).then(function(result){


                    if(result.length == 1)
                    {

                        next();
                    }
                }).catch(function(error){
                    console.log(error)
                    var anHourAgo = new Date();
                    anHourAgo.setHours(anHourAgo.getHours() -1);

                    response.cookie("currentSessionId", "", {expires : anHourAgo});
                    response.clearCookie("currentSessionId");
					response.cookie("isAdmin", "", {expires : anHourAgo});
					response.clearCookie("isAdmin");
                    response.redirect("/");


                });
                return;

            }



    next();
});



// Setup your routes here!

app.get("/", function (request, response) {
    if(request.cookies.currentSessionId){
        usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
            cartData.getCart(user[0].cartId).then(function (cart) {
                response.render("pages/homepage", {loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Home", cartCount: cart.recipes.length});
            }).catch(function(errorMessage){
                console.log(errorMessage);
            });
        }).catch(function(errorMessage){
            response.redirect("/login");
        });
    }
    else
    {
        response.render("pages/homepage", {loginFlag: request.cookies.currentSessionId, pageTitle: "Home"});
    }
});

app.post("/logout", function (request, response) {
    response.redirect("/");
});

app.get("/login",function (request, response){
    response.render("pages/index", {loginFlag: request.cookies.currentSessionId, pageTitle: "Login"});
});



// Create a user
app.post("/createUser", function(request, response) {
    usersData.createUser(_xss(request.body.register_email),_xss(request.body.register_passwd)).then(function(user) {
        console.log(user);
		
        if(user != "User already exists") {
            var expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            response.cookie('currentSessionId', user.currentSessionId, { expires: expiresAt });
			
			if(_xss(request.body.register_email) == 'admin@makemyrecipe.com'){
				response.cookie('isAdmin', 'true', { expires: expiresAt });
			}
            response.redirect("/");
        }else {

            response.render("pages/index", {error: "User already exists. Try Logging in.", pageTitle: "Registration Error"});

        }
    }, function(errorMessage) {
        response.status(500).json({ error: errorMessage });
    });
});

// Login
app.post("/login", function(request, response) {
    var uname,pwd;
    uname = _xss(request.body.login_email);
    pwd = _xss(request.body.login_passwd);
    if(uname && pwd){
    usersData.validateUser(uname, pwd).then(function(newSessionId) {
        var expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            response.cookie('currentSessionId', newSessionId, { expires: expiresAt });

        response.redirect("/");
    }, function(errorMessage) {
        response.render("pages/index", {error: errorMessage, pageTitle: "Login Error"});
    });
    }
});




app.get("/product/category/:category",function (request, response){
    var category = _xss(request.params.category);

    if(request.cookies.currentSessionId){
        usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
            cartData.getCart(user[0].cartId).then(function (cart) {
                var category = _xss(request.params.category);
				if(category == 'Favorites'){
					usersData.getUserFavorites(user[0]._id).then(function(fave){
                         if (fave.length == 0) {
                             response.render("pages/product_category", {resultData : [], loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Categories", cartCount: cart.recipes.length});
                         } else {
                             var favorites = [];
                             for (var f = 0; f < fave.length; f++) {
                                 (function(f) {
                                     recipeData.getRecipe(fave[f]).then(function(rec) {
                                         favorites.push(rec);
                                         if (f == fave.length-1) {
                                             response.render("pages/product_category", {resultData : favorites, loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Categories", cartCount: cart.recipes.length});
                                         }
                                    });
                                 })(f);
                             }
                        }
					});
						
                } else {
                    recipeData.getCategory(category).then(function(result){
                        for(var i=0; i<result.length; i++)
                        {
                            result[i] = recipeData.totalPrice(result[i]);
                        }
                        response.render("pages/product_category", {resultData : result, category: category, loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Categories", cartCount: cart.recipes.length})
                       });
				}

            }).catch(function(errorMessage){
                console.log(errorMessage);
            });
        }).catch(function(errorMessage){
            response.redirect("/login");
        });
    }
    else
    {
        var category = _xss(request.params.category);
            recipeData.getCategory(category).then(function(result){
                for(var i=0; i<result.length; i++)
                    {
                        result[i] = recipeData.totalPrice(result[i]);
                    }
                    response.render("pages/product_category", {resultData : result, category: category, loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Categories"})
            });
    }


});



app.get("/add-product",function (request, response){
    response.render("pages/add-product", {loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Add Product"});
});

app.post("/add-product",function (request, response){
    var recipe_name = _xss(request.body.recipe_name);
    var description = _xss(request.body.description);
    var image_url = _xss(request.body.image_url);
    var prep_time = _xss(request.body.prep_time);
    var cook_time = _xss(request.body.cook_time);
    var servings = _xss(request.body.servings);
    var cuisine = _xss(request.body.cuisine);
    var procedure = _xss(request.body.procedure);
    var ing_arr = _xss(request.body.i_name);
    var min_q = _xss(request.body.min_q);
    var price = _xss(request.body.price);
   
    var ingredientArray = [];
    for(var i=0; i<ing_arr.length; i++)
    {
        var newIngredient = {
                    _id: Guid.create().toString(),
                    name: ing_arr[i],
                    min_q: min_q[i],
                    price: price[i],
                }

        ingredientArray.push(newIngredient);
    }

    recipeData.addProduct(recipe_name, description, image_url, prep_time, cook_time, servings, cuisine, ingredientArray, procedure).then(function(result){
        if(result == true){
            response.render("pages/add-product",{success: "Successfully Added the Recipe", pageTitle: "Add Product"});
        }
    });



});


app.post("/search",function (request, response){
    if(request.cookies.currentSessionId){
        usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
            cartData.getCart(user[0].cartId).then(function (cart) {
                var keyword = _xss(request.body.keyword);
                recipeData.searchDB(keyword).then(function(result) {
                    for(var i=0; i<result.length; i++)
                    {
                        result[i] = recipeData.totalPrice(result[i]);
                    }
                    response.render("pages/search_results",{resultData : result, keyword : keyword, loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Search Results", cartCount: cart.recipes.length})
                });
            }).catch(function(errorMessage){
                console.log(errorMessage);
            });
        }).catch(function(errorMessage){
            response.redirect("/login");
        });
    }
    else
    {
        var keyword = _xss(request.body.keyword);
        recipeData.searchDB(keyword).then(function(result) {
            for(var i=0; i<result.length; i++)
            {
                result[i] = recipeData.totalPrice(result[i]);
            }
            response.render("pages/search_results",{resultData : result, keyword : keyword, loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Search Results"})
        });
    }
});


app.get("/products/:id", function(request,response){


    if(request.cookies.currentSessionId){
        usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
            cartData.getCart(user[0].cartId).then(function (cart) {
                recipeData.getRecipe(request.params.id).then(function(recipe){
                response.render("pages/product",{resultData: recipe, loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Recipe", cartCount: cart.recipes.length});
                    },function(errorMessage) {
                        response.status(500).json({ error: errorMessage });
                });
            }).catch(function(errorMessage){
                console.log(errorMessage);
            });
        }).catch(function(errorMessage){
            response.redirect("/login");
        });
    }
    else
    {
        recipeData.getRecipe(request.params.id).then(function(recipe){
            response.render("pages/product",{resultData: recipe, loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, pageTitle: "Recipe"});
            },function(errorMessage) {
                response.status(500).json({ error: errorMessage });
            });
    }


});

app.post("/cart/save", function(request, response) {
    usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
        cartData.updateCart(user[0].cartId, request.body.recipes).then(function() {
            response.status(200).json({message: "Cart saved"});
        }, function(errorMessage) {
            response.status(500).json({message: errorMessage});
        });
    }, function (errorMessage) {
        response.redirect("/login");
    });
});

app.post("/cart/add", function(request, response) {
    usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
        cartData.addRecipeToCart(user[0].cartId, request.body).then(function() {
            response.status(200).json({message: "Product added to Cart"});
        }, function(errorMessage) {
            response.status(500).json({message: errorMessage});
        });
    }, function (errorMessage) {
        response.redirect("/login");
    });
});

app.get("/cart", function(request, response) {
    usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
        cartData.getCart(user[0].cartId).then(function (cart) {
            cartData.displayCart(cart).then(function(displayCart) {

                response.render("pages/cart", { pageTitle: "Shopping Cart", cart: displayCart, loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, cartCount: cart.recipes.length });
            }).catch(function(error){
                console.log(error);
            });
        }).catch(function(errorMessage){
            console.log(errorMessage);
        });
    }).catch(function(errorMessage){
        response.redirect("/login");
    });
});

app.post("/checkout",function(request,response){
    var priceInfo = JSON.parse(request.body.priceInfo);
    usersData.getUserBySessionId(request.cookies.currentSessionId).then(function(user){
        cartData.getCart(user[0].cartId).then(function (cart) {
            cartData.displayCart(cart).then(function(displayCart) {
                response.render("pages/checkout_page", { pageTitle: "Checkout page", user:user[0], cart: displayCart, priceInfo: priceInfo, loginFlag: request.cookies.currentSessionId, adminFlag: request.cookies.isAdmin, cartCount: cart.recipes.length });
            }).catch(function(error){
                console.log(error);
            });
        }).catch(function(errorMessage){
            console.log(errorMessage);
        });
    }).catch(function(errorMessage){
        response.redirect("/login");
    });

});


app.post("/add/favorite", function(request, response) {
	console.log("recipe ID ::"+request.body.recipeID + " body"+request.body);
    usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
        usersData.addRecipeToFavorites(user[0]._id, request.body.recipeID).then(function() {
            response.status(200).json({message: "Favorites added to the user"});
        }, function(errorMessage) {
            response.status(500).json({message: errorMessage});
        });
    }, function (errorMessage) {
        response.redirect("/login");
    });
});

app.post("/remove/favorite", function(request, response) {
    usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
        usersData.removeRecipeFromFavorites(user[0]._id, request.body.recipeID).then(function() {
            response.status(200).json({message: "Favorite removed from user"});
        }, function(errorMessage) {
            response.status(500).json({message: errorMessage});
        });
    }, function (errorMessage) {
        response.redirect("/login");
    });
});

app.post("/order",function(request,response){
    usersData.getUserBySessionId(request.cookies.currentSessionId).then(function(user){
          console.log("REached");
        usersData.updateUser(request.cookies.currentSessionId, _xss(request.body.first_name), _xss(request.body.last_name),
        _xss( request.body.country), _xss(request.body.address), _xss(request.body.city), _xss(request.body.state), 
            _xss(request.body.zip_code),_xss(request.body.phone_number),_xss(request.body.car_number)).then(function(result){
                if(result==true){
                    console.log("User profile updated");
                    placeorder(request,response);
                }

            }).catch(function(error){
                console.log(error);
            });
            

    }).catch(function(errorMessage){
        response.redirect("/login");
    });
});

// ------------------------------ Dhanashree --------------------------------------- START
function getTotalCost(recipe) {
    
    if(recipe != null && recipe != undefined){
        var total_cost = 0;
        recipe.ingredients.forEach(function(ingredient) {
            total_cost += ingredient.price;
        }, this);
        return total_cost;
    }else{
        return 0;
    }
        
};

function getRecipeids(cart) {
    var recipeids = [];
    cart.recipes.forEach(function(recipe_info) {
        console.log('processing recipe data by larsen : ' + JSON.stringify(recipe_info));
        for(var key in recipe_info){        
            if(key == 'recipeId'){
                recipeids[recipeids.length] = recipe_info[key];
                break;
            }
        }
    }, this);
    
    /*cart.recipes.forEach(function(element) {
        recipeids[recipeids.length] = element.recipeId;
    }, this);*/
    
    return recipeids;
}

function getRecipeId(recipe_info) {
    var recipeid = null;
    for(var key in recipe_info){
        if(key == 'recipeId'){
            recipeid = recipe_info[key];
            break;
        }
    }
    return recipeid;
};

function getIngredientListing(recipe_info) {
    var data_dict = {};
    for(var key in recipe_info){
        if(key != 'recipeId'){
            data_dict[key] = recipe_info[key];
        }
    }
    return data_dict;
};

function getRecipe(recipeid, recipe_col) {
    var _recipe = null;
    recipe_col.forEach(function(recipe) {
        if(recipe._id == recipeid)
            _recipe = recipe;
    }, this);
    return _recipe;    
};
function getIngrdientPrice(ingredientid, recipe) {
    var price = 0;
    recipe.ingredients.forEach(function(ingredient) {
        if(ingredient._id == ingredientid){
            price =  ingredient.price;           
        }
    }, this);
    return price;
}

function getRecipePrice(listing , recipe_col) {
    //console.log(' **** listing ' + JSON.stringify(listing));
    var current_recipeid = getRecipeId(listing);
    //console.log(' **** current recipe id : ' + current_recipeid);
    var current_ingredient_infos = getIngredientListing(listing);
    //console.log(' **** List of ingredients : ' + JSON.stringify(current_ingredient_infos));
    var current_recipe = getRecipe(current_recipeid, recipe_col);
    //console.log(' **** current recipe being processed : ' + JSON.stringify(current_recipe));
    var price = 0;
    for(var key in current_ingredient_infos){
        
        var ingredient_id = key;
        //console.log(' **** ingredient ID : ' + key);
        var quantity = current_ingredient_infos[ingredient_id];
        //console.log(' **** Quantity of ingredients : ' + quantity);
        var ingredient_price = getIngrdientPrice(ingredient_id,current_recipe);
        //console.log(' **** Price of ingredient : ' + ingredient_price);
        price += (quantity * ingredient_price);
    }
    //console.log('Complete prize for recipe : ' + price);
    return price;
}
function getRecipeById(recipeid, recipecol) {
    var recipe = null;
    recipecol.forEach(function(_recipe) {
        if(_recipe._id == recipeid){
            recipe = _recipe;
        }
    }, this);
    return recipe;
}


function placeorder(request, response) {
    //console.log(' ***** In route /api/placeorder');
    if(request.cookies.currentSessionId){
        usersData.getUserBySessionId(request.cookies.currentSessionId).then(function (user) {
            var cart_id = user[0].cartId;
            console.log('User Name ' + user[0].username);
                cartData.getCart(cart_id).then(function (cart_item) {
                //console.log(' ***** cart to be processed : ' +JSON.stringify(cart_item));
                var _recipes = getRecipeids(cart_item);
                //console.log(' ***** Recipe Id : ' + _recipes);    
                recipeData.getRecipes_byIds(_recipes).then(function (recipe_col) {
                    //console.log(' ***** Recipe Collection : ' + JSON.stringify(recipe_col));
                    var _products = [];
                    var totalprice = 0;
                    cart_item.recipes.forEach(function(recipe_info) {
                        
                        var recipe_price = getRecipePrice(recipe_info , recipe_col);
                        totalprice +=recipe_price;
                        var current_recipeid = getRecipeId(recipe_info);
                        var current_recipe = getRecipe(current_recipeid, recipe_col);
                        var recipename = current_recipe.name;
                        _products[_products.length] = { productname : recipename , productprice : recipe_price };
                    }, this);
                    
                    
                    recipeData.createbill_updatecart(cart_id, user[0]._id).then(function (_orderid) {
                        var order_detail = {
                            firstname : user[0].profile.firstName == undefined ? '' : user[0].profile.firstName,
                            lastname : user[0].profile.lastName == undefined ? '' : user[0].profile.lastName,
                            contactnumber : user[0].profile.phone == undefined ? '' : user[0].profile.phone,
                            address : user[0].profile.address == undefined ? '' : user[0].profile.address,
                            zip : user[0].profile.zip == undefined ? '' : user[0].profile.zip,
                            city : user[0].profile.city == undefined ? '' : user[0].profile.city,
                            country : user[0].profile.country == undefined ? '' : user[0].profile.country,
                            orderid : _orderid,
                            purchasecost : totalprice,
                            products : _products,
                            pageTitle : "Order Page",
                            loginFlag: request.cookies.currentSessionId
                        };
                        console.log(' ****Email : ' + order_detail.email);
                        return response.render( 'pages/order_page.ejs', order_detail);
                    });
                 });                    
            });
                        
        }).catch(function(errorMessage){
            response.redirect("/login");
        });
    }
    else
    {
        response.render("pages/homepage", {loginFlag: request.cookies.currentSessionId, pageTitle: "Home"});
    }
}

// ------------------------------ Dhanashree --------------------------------------- END


// We can now navigate to localhost:3000
app.listen(3000, function () {
    console.log('Your server is now listening on port 3000! Navigate to http://localhost:3000 to access it');
});
