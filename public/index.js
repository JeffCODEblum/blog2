var URL = 'http://localhost:4000';
$(".nav-link").click(function(e) {

});

$(".img-thmb").click(function(e) {
    $(".main-img").attr("src", URL + "/" + $(e.target).data("src"));
});
