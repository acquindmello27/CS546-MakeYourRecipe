(function ($) {
    //$("input").on("change paste keyup", function() {
    $("input").on("change paste", function() {
        updateCartPrice();
    });

    updateCartPrice();
        
    function updateCartPrice() {
        var cartTotal = 0;
        
        $("tbody > tr").each(function () {
            var recipeTotal = 0.0;
            var ingredientList = $(this).find("ul");

            ingredientList.children("li").each(function () {
                var form = $(this).find(".form-inline");
                var count = $(this).find("input").val();
                var price = $(this).find(".price").text();
                
                if (validateInput(form, count)) {
                    removeError(form);
                    recipeTotal += count * price;
                }
            });
            cartTotal += recipeTotal;
            recipeTotal = parseFloat(recipeTotal).toFixed(2);
            $(this).find(".recipe-price").text("$" + recipeTotal);
        });

        cartTotal = parseFloat(cartTotal).toFixed(2);
        $(".cart-price").text("$" + cartTotal);
    }
    
    function validateInput(form, value) {
        if (value == null | value == undefined || isNaN(value) || value === "") {
            addError(form, "Invalid: not a number");
            return false;
        } else if (value < 0) {
            addError(form, "Invalid: number below zero");
            return false;
        }
        
        return true;
    }
    
    function addError(element, error) {
        removeError(element); // remove previous error
        element.addClass("has-error");
        var error = $("<span class=\"help-block\"></span>").text(error);
        element.append(error);
    }
    
    function removeError(element) {
        element.find($(".help-block")).remove();
        element.removeClass("has-error");
    }
})(jQuery);