var URL = $("#url-div").data("url");
$( document ).ready(function() {
    var token = localStorage.getItem('jwt');
    if (token) {
        $.ajax({
            type: 'GET',
            url: URL + '/admin',
            contentType: 'html',
            beforeSend: function (xhr) { 
                xhr.setRequestHeader("Authorization", localStorage.getItem("jwt"));
            }
        }).done(function(data) {
            var newDoc = document.open("text/html", "replace");
            newDoc.write(data);
            newDoc.close();
            window.history.pushState({"html":"data","pageTitle":"admin"},"", URL + "/admin");
        });
    }

    $("#login-form").submit(function(e) {
        e.preventDefault();
        var username = $("#username-input").val();
        var password = $("#password-input").val();
        payload = {};
        payload.username = username;
        payload.password = password;
        $.ajax({
            type: 'POST',
            url: URL + '/login-submit',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            data: JSON.stringify(payload),
        }).done(function(data) {
            if (data.jwt) {
                localStorage.setItem("jwt", data.jwt);
                $.ajax({
                    type: 'GET',
                    url: URL + '/admin',
                    contentType: 'html',
                    beforeSend: function (xhr) { 
                        xhr.setRequestHeader("Authorization", localStorage.getItem("jwt"));
                    }
                }).done(function(data) {
                    var newDoc = document.open("text/html", "replace");
                    newDoc.write(data);
                    newDoc.close();
                    window.history.pushState({"html":"data","pageTitle":"admin"},"", URL + "/admin");
                });
            }
        }).fail(function(e) {
            console.log(e);
        });
    });
});