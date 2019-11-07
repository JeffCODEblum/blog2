const express = require('express');
const exphbs  = require('express-handlebars');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const testData = require('./testData.js');
const Moment = require ('moment');

mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

const ItemSchema = new mongoose.Schema({title: String, imageUrls: [String], description: String, timestamp: String, body: String});
const ItemModel = new mongoose.model('ItemModel', ItemSchema);

const CommentSchema = new mongoose.Schema({email: String, name: String, comment: String, timestamp: String, hidden: Boolean, postId: String});
const CommentModel = new mongoose.model('CommentModel', CommentSchema);

app.use(express.static('public'))
app.use(bodyParser.json());

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

const APP_URL = 'http://localhost:4000';

const data = testData;
function authenticate(req, res, callback) {
    if (!req.headers.authorization) {
        res.redirect(APP_URL + '/login');
    }
    else {
        var token = req.headers.authorization;
        try {
            var decoded = jwt.verify(token, 'private-key');
            if (decoded) {
                callback();
            }
            else {
                res.sendStatus(403);
            }
        }
        catch(err) {
            console.log(err);
            res.sendStatus(403);
        }
    }
    return;
}

// dummy data load
app.get('/prime-db', (req, res) => {
    for (let j = 0; j < 30; j++) {
        for (let i = 0; i < data.items.length; i++) {
            const img = data.images[i].replace(/^data:image\/\w+;base64,/, "");
            const buf = Buffer.from(img, 'base64');
            const fullpathname = '/uploads/' + Date.now() + '.png';
            fs.writeFile('./public' + fullpathname, buf, () => {
                const model = new ItemModel({
                    title: data.items[i].title,
                    description: data.items[i].description,
                    imageUrls: [fullpathname],
                    timestamp: '' + Date.now() - j * 1000 * 60 * 60 * 24 * 31,
                    body: data.items[i].body
                });
                model.save();
                return;
            });
        }
    }
    res.send(true);
    return;
});
 
// home page
app.get('/', (req, res) => {
   res.redirect('/from/0');
});

app.get('/from/:from', (req, res) => {
    let from = parseInt(req.params.from);
    if (!from) from = Date.now();
    ItemModel.find({timestamp: {$lte: from}}).limit(10).sort('-timestamp').exec((err, docs) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        else {
            const context = docs.map(item => {return { 
                id: item.id, 
                title: item.title, 
                description: item.description, 
                imageUrl: item.imageUrls[0], 
                timestamp: Moment(parseInt(item.timestamp)).format("MMMM Do YYYY"),
                body: item.body,
                url: APP_URL
            }});
            res.render('home', {items: context});
        }
    });
    return;
});

// detail page
app.get('/detail/:id', (req, res) => {
    ItemModel.findOne({_id: req.params.id}, (err, doc) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        if (doc) {
            CommentModel.find({postId: req.params.id}, (err, docs) => {
                if (err) {
                    console.log(err);
                    res.sendStatus(500);
                }
                if (docs) {
                    const comments = docs.map(doc => {
                        return {
                            email: doc.email, 
                            name: doc.name, 
                            comment: doc.comment, 
                            timestamp: Moment(parseInt(doc.timestamp)).format('MMMM Do YYYY'),
                        }
                    });
                    const context = { 
                        id: doc.id, 
                        title: doc.title, 
                        imageUrls: doc.imageUrls, 
                        description: doc.description, 
                        url: APP_URL, 
                        mainImageUrl: doc.imageUrls[0],
                        timestamp: doc.timestamp,
                        comments: comments,
                        body: doc.body
                    };
                    res.render('detail', context);
                }
            });
        }
    });
    return;
});

// login page
app.get('/login', (req, res) => {
    res.render('login', {url: APP_URL});
    return;
});

// login submit
app.post('/login-submit', (req, res) => {
    if (req.body.username === 'admin' && req.body.password === 'admin') {
        var token = jwt.sign({ foo: 'bar'}, 'private-key');
        res.send({
            jwt: token
        });
    }
    else {
        res.status(401);
    }
    return;
});

// main admin page
app.get('/admin', (req, res) => {
    authenticate(req, res, () => {
        var context = {url: APP_URL};
        ItemModel.find({}, (err, docs) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            }
            if (docs) {
                context.items =  docs.map(item => {return { 
                    id: item.id, 
                    title: item.title, 
                    imageUrl: item.imageUrls[0], 
                    timestamp: Moment(parseInt(item.timestamp)).format('MMMM Do YYYY')
                }});
                context.editItem = false;
                res.render('admin', context);
            }
            return;
        });
        return;
    });         
    return;
});

// admin detail page
app.get('/admin-new', (req, res) => {
    authenticate(req, res, () => {
        const context = {url: APP_URL};
        res.render('admin-new', context);
    });
    return;
});

// admin detail page
app.get('/admin/:id', (req, res) => {
    authenticate(req, res, () => {
        const id = req.params.id;
        ItemModel.findOne({_id: id}, (err, doc) => {
            if (err) {
                console.log(err);
            }
            if (doc) {
                CommentModel.find({postId: id}, (err, docs) => {
                    if (err) {
                        console.log(err);
                        res.sendStatus(500);
                    }
                    if (doc) {
                        const comments = docs.map(doc => {
                            return {
                                id: doc._id,
                                name: doc.name,
                                email: doc.email,
                                comment: doc.comment,
                                timestamp: Moment(parseInt(doc.timestamp)).format('MMMM Do YYYY')
                            } 
                        });
                        const context = {url: APP_URL, editItem: doc, comments: comments};
                        res.render('admin-edit', context);
                    }
                    return;
                });
            }
            return;
        });
        return;
    });
    return;
});

// upload image
app.post('/upload-image', (req, res) => {
    authenticate(req, res, () => {
        const img = req.body.file.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(img, 'base64');
        const fullpathname = '/uploads/' + Date.now() + '.png';
        const id = req.body.id;
        ItemModel.findOneAndUpdate({_id: id}, {$push: {imageUrls: fullpathname}}, {}, (err, doc) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            }
            if (doc) {
                fs.writeFile('./public' + fullpathname, buf, () => {
                    res.send(true);
                    return;
                });
            }
            return;
        });
        return;
    });
    return;
});

app.post('/post-comment/:id', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const comment = req.body.comment;
    const timestamp = Date.now() + '';
    const id = req.params.id;

    const commentModel = new CommentModel({
        name: name,
        email: email,
        comment: comment,
        hidden: true,
        timestamp: timestamp,
        postId: id
    });

    commentModel.save((err, doc) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        if (doc) {
            res.send(true);
        }
        return;
    });
    return;
});

app.delete('/delete-comment/:id', (req, res) => {
    console.log("delete fired");
    authenticate(req, res, () => {
        const id = req.params.id;
        CommentModel.deleteOne({_id: id}, (err, doc) => {
            if (err) {
                console.log(err);
                res.send(500);
            }
            if (doc) {
                res.send(true);
            }
            return;
        });
        return;
    });
    return;
});

app.post('/save-post', (req, res) => {
    authenticate(req, res, () => {
        const title = req.body.title;
        const description = req.body.description;
        const body = req.body.body;
        const model = new ItemModel({
            title: title, 
            description: description, 
            imageUrls: [], 
            timestamp: '' + Date.now(),
            body: body
        });
        console.log(model);
        model.save((err, doc) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            }
            if (doc) {
                console.log("saved");
                res.send(true);
            }
            return;
        });
        return;
    });  
    return;
});

// save item
app.post('/save-post/:id', (req, res) => {
    authenticate(req, res, () => {
        const title = req.body.title;
        const description = req.body.description;
        const body = req.body.body;
        const id = req.params.id;
        if (id) {
            ItemModel.findOneAndUpdate({_id: id}, {title: title, description: description, body: body}, (err, doc) => {
                if (err) {
                    console.log(err);
                    res.sendStatus(500);
                }
                if (doc) {
                    res.send(true);
                }
                return;
            });
        }
        return;
    });    
    return;
});

// shift image
app.post('/shift-image/:id/:file', (req, res) => {
    authenticate(req, res, () => {
        ItemModel.findOne({_id: req.params.id}, (err, doc) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            }
            if (doc) {
                const imageUrls = doc.imageUrls;
                const filename = '/uploads/' + req.params.file + '.png';
                const originalIndex = imageUrls.indexOf(filename);
                imageUrls.splice(originalIndex, 1);
                if (originalIndex == 0) {
                    imageUrls.push(filename);
                }
                else {
                    const newIndex = originalIndex - 1;
                    const newArray = [];
                    for (let j = 0; j < imageUrls.length + 1; j++) {
                        if (j == newIndex) {
                            newArray.push(filename);
                        }
                        else {
                            if (j < newIndex) {
                                newArray.push(imageUrls[j]);
                            }
                            else {
                                newArray.push(imageUrls[j - 1]);
                            }
                        }
                    }
                    ItemModel.findOneAndUpdate({_id: req.params.id}, {imageUrls: newArray}, (err, doc) => {
                        if (err) {
                            console.log(err);
                            res.sendStatus(500);
                        }
                        if (doc) {
                            res.send(true);
                        }
                        return;
                    });
                }
            }
            return;
        });
        return;
    });     
    return;
});

// delete image
app.delete('/delete-image/:id/:file', (req, res) => {
    authenticate(req, res, () => {
        const id = req.params.id;
        const file = req.params.file;
        ItemModel.findOne({_id: id}, (err, doc) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            }
            if (doc) {
                const array = doc.imageUrls;
                array.splice(array.indexOf(file), 1);
                ItemModel.findOneAndUpdate({_id: id}, {imageUrls: array}, (err, doc) => {
                    if (err) {
                        console.log(err);
                        res.sendStatus(500);
                    }
                    if (doc) {
                        res.send(true);
                    }
                    return;
                });
            }
            return;
        });
        return;
    }); 
    return;
});

// delete item
app.delete('/delete-post/:id', (req, res) => {
    authenticate(req, res, () => {
        const id = req.params.id;
        ItemModel.deleteOne({_id: id}, (err, doc) => {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            }
            if (doc) {
                res.send(true);
            }
            return;
        });
        return;
    });      
    return;
});

app.listen(4000);
