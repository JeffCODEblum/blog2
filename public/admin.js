$( document ).ready(function() {
    var URL = $("#url-div").data("url");

    // go to edit page
    $(".edit-btn").click(function(e) {
        e.preventDefault();
        var id = $(e.target).data('id');
        $.ajax({
            type: 'GET',
            url: URL + '/admin/' + id,
            contentType: 'html',
            beforeSend: function (xhr) { 
                xhr.setRequestHeader("Authorization", localStorage.getItem("jwt"));
            }
        }).done(function(data) {
            var newDoc = document.open("text/html", "replace");
            newDoc.write(data);
            newDoc.close();
            window.history.pushState({"html":"data","pageTitle":"admin"},"", URL + "/admin/" + id);
        });
    });
    
    // delete post
    $(".delete-btn").click(function(e) {
        e.preventDefault();
        var id = $(e.target).data("id");
        $.ajax({
            type: 'DELETE',
            url: URL + '/delete-post/' + id ,
            contentType: 'application/json; charset=utf-8',
            beforeSend: function (xhr) {  
                xhr.setRequestHeader("Authorization", localStorage.getItem("jwt"));
            }
        }).done(function(data) {
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
        }).fail(function(e) {
            console.log(e);
        });
    });

    // go to create post page
    $("#create-btn").click(function(e) {
        e.preventDefault();
        $.ajax({
            type: 'GET',
            url: URL + '/admin-new',
            contentType: 'html',
            beforeSend: function (xhr) { 
                xhr.setRequestHeader("Authorization", localStorage.getItem("jwt"));
            }
        }).done(function(data) {
            console.log("got it");
            var newDoc = document.open("text/html", "replace");
            newDoc.write(data);
            newDoc.close();
            window.history.pushState({"html":"data","pageTitle":"admin-new"},"", URL + "/admin-new");
        });
    });
});