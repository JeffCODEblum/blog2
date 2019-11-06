$( document ).ready(function() {

    var URL = $("#url-div").data("url");
    console.log($("#url-div"));
    console.log("url", URL);
    $(".nav-link").click(function(e) {

    });

    $(".img-thmb").click(function(e) {
        $(".main-img").attr("src", URL + "/" + $(e.target).data("src"));
    });

    $("#comment-btn").click(function(e) {
        var name = $("#name-input").val();
        var email = $("#email-input").val();
        var comment = $("#comment-input").val();
        var id = $("#id-div").data("id");
        var payload = {
            name: name,
            email: email,
            comment: comment
        };

        $.ajax({
            type: 'POST',
            url: URL + '/post-comment/' + id,
            contentType: 'application/json; charset=utf-8',
            beforeSend: function(xhr) {
                xhr.setRequestHeader("Authorization", localStorage.getItem("jwt"));
            },
            data: JSON.stringify(payload)
        }).done(function(data) {

        });
    });
});