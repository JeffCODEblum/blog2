const express = require('express');
const exphbs  = require('express-handlebars');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});

const ItemSchema = new mongoose.Schema({title: String, imageUrls: [String], description: String});
const ItemModel = new mongoose.model('ItemModel', ItemSchema);

app.use(express.static('public'))
app.use(bodyParser.json());
 
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

const APP_URL = 'http://localhost:4000';

const data = {
    items: [
        {
            title: 'foo1',
            description: 'this is a great buffalo nickel blah blah blah'
        },
        {
            title: 'foo2',
            description: 'this is a great buffalo nickel blah blah blah'
        },
        {
            title: 'foo3',
            description: 'this is a great buffalo nickel blah blah blah'
        }
    ]
};

// dummy data load
app.get('/prime-db', (req, res) => {
    for (let i = 0; i < data.items.length; i++) {
        const model = new ItemModel({
            title: data.items[i].title,
            description: data.items[i].description
        });
        model.save();
    }
    res.send(true);
    return;
});
 
// home page
app.get('/', (req, res) => {
    ItemModel.find({}, (err, docs) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        else {
            const context = docs.map(item => {return { id: item.id, title: item.title, imageUrl: item.imageUrls[0]}});
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
            const context = { 
                id: doc.id, 
                title: doc.title, 
                imageUrls: doc.imageUrls, 
                description: doc.description, 
                url: APP_URL, 
                mainImageUrl: doc.imageUrls[0]
            };
            res.render('detail', context);
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
    if (!req.headers.authorization) {
        res.redirect(APP_URL + '/login');
    }
    else {
        var token = req.headers.authorization;
        try {
            var decoded = jwt.verify(token, 'private-key');
            if (decoded) {
                var context = {url: APP_URL};
                ItemModel.find({}, function(err, docs) {
                    if (err) {
                        console.log(err);
                        res.sendStatus(500);
                    }
                    if (docs) {
                        context.items =  docs.map(item => {return { id: item.id, title: item.title, imageUrl: item.imageUrls[0]}});
                        context.editItem = false;
                        res.render('admin', context);
                    }
                });
            }
            else {
                res.redirect(APP_URL + '/login');
            }
        }
        catch (e) {
            console.log(e);
            res.sendStatus(403);
        }
    }
    return;
});

// admin detail page
app.get('/admin/:id', (req, res) => {
    if (!req.headers.authorization) {
        res.redirect(APP_URL + '/login');
    }
    else {
        const token = req.headers.authorization;
        try {
            const decoded = jwt.verify(token, 'private-key');
            if (decoded) {
                const id = req.params.id;
                ItemModel.findOne({_id: id}, (err, doc) => {
                    if (err) {
                        console.log(err);
                    }
                    if (doc) {
                        const context = {url: APP_URL, editItem: doc};
                        ItemModel.find({}, function(err, docs) {
                            if (err) {
                                console.log(err);
                                res.sendStatus(500);
                            }
                            if (docs) {
                                context.items = docs.map(item => {return { id: item.id, title: item.title, imageUrl: item.imageUrls[0]}});
                                res.render('admin', context);
                            }
                        });
                    }
                });
            }
            else {
                res.redirect(APP_URL + '/login');
            }
        }
        catch (e) {
            console.log(e);
            res.sendStatus(403);
        }
    }
    return;
});

// upload image
app.post('/upload-image', (req, res) => {
    const token = req.headers.authorization;
    try {
        const decoded = jwt.verify(token, 'private-key');
        if (decoded) {
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
        }
        else {
            res.sendStatus(403);
        }
    }
    catch (e) {
        res.sendStatus(403);
    }
    return;
});

app.post('/save-post', (req, res) => {
    if (!req.headers.authorization) {
        res.sendStatus(403);
    }
    else {
        const token = req.headers.authorization;
        try {
            const decoded = jwt.verify(token, 'private-key');
            if (decoded) {
                const title = req.body.title;
                const description = req.body.description;
                const model = new ItemModel({title: title, description: description, imageUrls: []});
                model.save((err, doc) => {
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
            else {
                res.sendStatus(403);
            }
        }
        catch(e) {
            console.log(e);
            res.sendStatus(403);
        }
    }
    return;
});

// save item
app.post('/save-post/:id', (req, res) => {
    if (!req.headers.authorization) {
        res.sendStatus(403);
    }
    else {
        const token = req.headers.authorization;
        try {
            const decoded = jwt.verify(token, 'private-key');
            if (decoded) {
                const title = req.body.title;
                const description = req.body.description;
                const id = req.params.id;
                if (id) {
                    ItemModel.findOneAndUpdate({_id: id}, {title: title, description: description}, function(err, doc) {
                        if (err) {
                            console.log(err);
                            res.sendStatus(500);
                        }
                        if (doc) {
                            res.send(true);
                        }
                    });
                }
            }
            else {
                res.sendStatus(403);
            }
        }
        catch(e) {
            console.log(e);
            res.sendStatus(403);
        }
    }
    return;
});

// shift image
app.post('/shift-image/:id/:file', (req, res) => {
    if (!req.headers.authorization) {
        res.sendStatus(403);
    }
    else {
        const token = req.headers.authorization;
        try {
            const decoded = jwt.verify(token, 'private-key');
            if (decoded) {
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
            }
            else {
                res.sendStatus(403);
            }
        } catch(e) {
            res.sendStatus(403);
        }
    }
    return;
});

// delete image
app.delete('/delete-image/:id/:file', (req, res) => {
    if (!req.headers.authorization) {
        res.sendStatus(403);
    }
    else {
        const token = req.headers.authorization;
        try {
            const decoded = jwt.verify(token, 'private-key');
            if (decoded) {
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
            }
            else {
                res.sendStatus(403);
            }
        }
        catch (err) {
            res.sendStatus(403);
        }
    }
    return;
});

// delete item
app.delete('/delete-post/:id', (req, res) => {
    if (!req.headers.authorization) {
        res.sendStatus(403);
    }
    else {
        const token = req.headers.authorization;
        try {
            const decoded = jwt.verify(token, 'private-key');
            if (decoded) {
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
            }
            else {
                res.sendStatus(403);
            }
        }
        catch (e) {
            console.log(e);
            res.sendStatus(403);
        }
    }
    return;
});

app.listen(4000);
